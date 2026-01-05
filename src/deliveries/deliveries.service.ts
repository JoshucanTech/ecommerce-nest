// backend/src/deliveries/deliveries.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { AssignRiderDto } from './dto/assign-rider.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { DeliveryStatus, OrderStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RidersService } from '../riders/riders.service';
import { calculateDistance } from '../utils/geo';

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private ridersService: RidersService,
  ) { }

  async create(createDeliveryDto: CreateDeliveryDto, user: any) {
    const {
      orderId,
      pickupAddress,
      deliveryAddress,
      estimatedDeliveryTime,
      notes,
    } = createDeliveryDto;

    // Check if order exists
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendor: true,
        user: true,
        delivery: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Check if delivery already exists for this order
    if (order.delivery) {
      throw new BadRequestException('Delivery already exists for this order');
    }

    // Check if user is authorized to create delivery for this order
    if (
      user.role !== 'ADMIN' &&
      (user.role !== 'VENDOR' || order.vendor?.userId !== user.id)
    ) {
      throw new ForbiddenException(
        'You do not have permission to create delivery for this order',
      );
    }

    // Check if order status is appropriate for delivery
    if (
      order.status !== OrderStatus.PROCESSING &&
      order.status !== OrderStatus.SHIPPED
    ) {
      throw new BadRequestException(
        'Order must be in PROCESSING or SHIPPED status to create delivery',
      );
    }

    // Generate tracking number
    const trackingNumber = this.generateTrackingNumber();

    // Create delivery
    const delivery = await this.prisma.delivery.create({
      data: {
        orderId,
        pickupAddress,
        pickupLatitude: createDeliveryDto.pickupLatitude,
        pickupLongitude: createDeliveryDto.pickupLongitude,
        deliveryAddress,
        deliveryLatitude: createDeliveryDto.deliveryLatitude,
        deliveryLongitude: createDeliveryDto.deliveryLongitude,
        estimatedDeliveryTime: estimatedDeliveryTime
          ? new Date(estimatedDeliveryTime)
          : undefined,
        notes,
        trackingNumber,
        status: DeliveryStatus.PENDING,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
          },
        },
      },
    });

    // Notify nearby riders
    if (delivery.pickupLatitude && delivery.pickupLongitude) {
      const nearbyRiders = await this.ridersService.findAvailable(
        delivery.pickupLatitude,
        delivery.pickupLongitude,
        5, // 5km radius
      );

      for (const rider of nearbyRiders.data) {
        await this.notificationsService.create({
          userId: rider.user.id,
          type: 'DELIVERY',
          title: 'New Delivery Available',
          message: `A new delivery for order #${delivery.order.orderNumber} is available near you.`,
          data: JSON.stringify({
            deliveryId: delivery.id,
            orderNumber: delivery.order.orderNumber,
            pickupAddress: delivery.pickupAddress,
            deliveryAddress: delivery.deliveryAddress,
          }),
        });
      }
    }

    // Update order status to SHIPPED if it's in PROCESSING
    if (order.status === OrderStatus.PROCESSING) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.SHIPPED,
        },
      });
    }

    // Create notification for user
    await this.notificationsService.create({
      userId: order.userId,
      type: 'DELIVERY',
      title: 'Delivery Created',
      message: `Delivery for your order #${order.orderNumber} has been created. Tracking number: ${trackingNumber}`,
      data: `{
       orderId: order.id,
       deliveryId: delivery.id,
       trackingNumber,
     }`,
    });

    return delivery;
  }

  async findAll(
    params: { page: number; limit: number; status?: string },
    user?: any,
  ) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (status) {
      where.status = status;
    }

    // Scoped access for SUB_ADMIN
    if (user?.role === 'SUB_ADMIN') {
      const subAdmin = await this.prisma.user.findUnique({
        where: { id: user.id },
      });

      if (subAdmin?.assignedCity || subAdmin?.assignedState) {
        where.OR = [];
        if (subAdmin.assignedCity) {
          where.OR.push({ pickupAddress: { contains: subAdmin.assignedCity, mode: 'insensitive' } });
          where.OR.push({ deliveryAddress: { contains: subAdmin.assignedCity, mode: 'insensitive' } });
        }
        if (subAdmin.assignedState) {
          where.OR.push({ pickupAddress: { contains: subAdmin.assignedState, mode: 'insensitive' } });
          where.OR.push({ deliveryAddress: { contains: subAdmin.assignedState, mode: 'insensitive' } });
        }
      }
    }

    // Get deliveries with pagination
    const [deliveries, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              vendor: {
                select: {
                  id: true,
                  businessName: true,
                  slug: true,
                },
              },
            },
          },
          rider: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data: deliveries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findRiderDeliveries(
    userId: string,
    params: {
      page: number;
      limit: number;
      status?: string;
    },
  ) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    // Get rider ID
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new ForbiddenException('User is not a rider');
    }

    // Build where conditions
    const where: any = {
      riderId: rider.id,
    };

    if (status) {
      where.status = status;
    }

    // Get deliveries with pagination
    const [deliveries, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
              vendor: {
                select: {
                  id: true,
                  businessName: true,
                  businessPhone: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data: deliveries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findVendorDeliveries(
    userId: string,
    params: {
      page: number;
      limit: number;
      status?: string;
    },
  ) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    // Get vendor ID
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new ForbiddenException('User is not a vendor');
    }

    // Build where conditions
    const where: any = {
      order: {
        vendorId: vendor.id,
      },
    };

    if (status) {
      where.status = status;
    }

    // Get deliveries with pagination
    const [deliveries, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          rider: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data: deliveries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findUserDeliveries(
    userId: string,
    params: {
      page: number;
      limit: number;
      status?: string;
    },
  ) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {
      order: {
        userId,
      },
    };

    if (status) {
      where.status = status;
    }

    // Get deliveries with pagination
    const [deliveries, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              vendor: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
            },
          },
          rider: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data: deliveries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: any) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            userId: true,
            vendorId: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            vendor: {
              select: {
                id: true,
                userId: true,
                businessName: true,
                businessPhone: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            },
          },
        },
        rider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    // Check if user is authorized to view this delivery
    if (
      user.role !== 'ADMIN' &&
      delivery.order.userId !== user.id &&
      delivery.order.vendor?.userId !== user.id &&
      delivery.rider?.userId !== user.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this delivery',
      );
    }

    return delivery;
  }

  async assignRider(id: string, assignRiderDto: AssignRiderDto) {
    const { riderId } = assignRiderDto;

    // Check if delivery exists
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    // Check if rider exists and is available
    const rider = await this.prisma.rider.findUnique({
      where: {
        id: riderId,
        isVerified: true,
        isAvailable: true,
      },
    });

    if (!rider) {
      throw new BadRequestException('Rider not found or not available');
    }

    // Check if delivery status is appropriate for rider assignment
    if (delivery.status !== DeliveryStatus.PENDING) {
      throw new BadRequestException(
        'Delivery must be in PENDING status to assign a rider',
      );
    }

    // Update delivery
    const updatedDelivery = await this.prisma.delivery.update({
      where: { id },
      data: {
        riderId,
        status: DeliveryStatus.ASSIGNED,
      },
      include: {
        rider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // Create notification for user
    await this.notificationsService.create({
      userId: delivery.order.userId,
      type: 'DELIVERY',
      title: 'Rider Assigned',
      message: `A rider has been assigned to your delivery for order #${delivery.order.orderNumber}`,
      data: `{
       orderId: delivery.order.id,
       deliveryId: delivery.id,
       riderId,
     }`,
    });

    // Create notification for rider
    await this.notificationsService.create({
      userId: rider.userId,
      type: 'DELIVERY',
      title: 'New Delivery Assignment',
      message: `You have been assigned to a new delivery for order #${delivery.order.orderNumber}`,
      data: `{
       orderId: delivery.order.id,
       deliveryId: delivery.id,
     }`,
    });

    return updatedDelivery;
  }

  async updateStatus(
    id: string,
    updateDeliveryStatusDto: UpdateDeliveryStatusDto,
    user: any,
  ) {
    const { status, notes } = updateDeliveryStatusDto;

    // Check if delivery exists
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            userId: true,
            vendor: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
        rider: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    // Check if user is authorized to update this delivery
    const isRider = delivery.rider?.userId === user.id;
    const isVendor = delivery.order.vendor?.userId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isRider && !isVendor && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to update this delivery',
      );
    }

    // Validate status transition
    this.validateStatusTransition(
      delivery.status,
      status,
      isRider,
      isVendor,
      isAdmin,
    );

    // Update delivery
    const updatedDelivery = await this.prisma.delivery.update({
      where: { id },
      data: {
        status,
        actualDeliveryTime:
          status === DeliveryStatus.DELIVERED ? new Date() : undefined,
      },
    });

    // Sync order status
    let newOrderStatus: OrderStatus | null = null;
    if (status === DeliveryStatus.PICKED_UP || status === DeliveryStatus.IN_TRANSIT) {
      newOrderStatus = status === DeliveryStatus.IN_TRANSIT ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.SHIPPED;
    } else if (status === DeliveryStatus.DELIVERED) {
      newOrderStatus = OrderStatus.DELIVERED;
    }

    if (newOrderStatus && delivery.order.status !== newOrderStatus) {
      await this.prisma.order.update({
        where: { id: delivery.order.id },
        data: { status: newOrderStatus },
      });
    }

    // Create notification for user
    await this.notificationsService.create({
      userId: delivery.order.userId,
      type: 'DELIVERY',
      title: 'Delivery Status Updated',
      message: `Your delivery for order #${delivery.order.orderNumber} has been updated to ${status}${notes ? `: ${notes}` : ''}`,
      data: `{
       orderId: delivery.order.id,
       deliveryId: delivery.id,
       status,
     }`,
    });

    // Create rider earnings if delivery is completed
    if (status === DeliveryStatus.DELIVERED && delivery.riderId) {
      // Calculate earnings (10% of order total or minimum $5)
      const order = await this.prisma.order.findUnique({
        where: { id: delivery.order.id },
        select: { totalAmount: true },
      });

      const earnings = Math.max(order.totalAmount * 0.1, 5);

      await this.prisma.riderEarning.create({
        data: {
          riderId: delivery.riderId,
          amount: earnings,
          description: `Earnings for delivery #${delivery.trackingNumber}`,
          deliveryId: delivery.id,
        },
      });
    }

    return updatedDelivery;
  }

  async findAvailableForRider(
    userId: string,
    params: { radius?: number; page?: number; limit?: number },
  ) {
    const { radius = 5, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const rider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (!rider || !rider.isVerified) {
      throw new ForbiddenException('Only verified riders can view deliveries');
    }

    if (!rider.currentLatitude || !rider.currentLongitude) {
      throw new BadRequestException('Rider location not updated');
    }

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        status: DeliveryStatus.PENDING,
        riderId: null,
        pickupLatitude: { not: null },
        pickupLongitude: { not: null },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
          },
        },
      },
    });

    const deliveriesWithDistance = deliveries
      .map((delivery) => {
        const distance = calculateDistance(
          rider.currentLatitude,
          rider.currentLongitude,
          delivery.pickupLatitude,
          delivery.pickupLongitude,
        );

        return {
          ...delivery,
          distance: Number.parseFloat(distance.toFixed(2)),
        };
      })
      .filter((d) => d.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    const data = deliveriesWithDistance.slice(skip, skip + limit);

    return {
      data,
      meta: {
        total: deliveriesWithDistance.length,
        page,
        limit,
      },
    };
  }

  async acceptDelivery(id: string, userId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!rider || !rider.isVerified) {
      throw new ForbiddenException('Only verified riders can accept deliveries');
    }

    if (!rider.isAvailable) {
      throw new BadRequestException(
        'You must be available to accept deliveries',
      );
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    if (delivery.status !== DeliveryStatus.PENDING || delivery.riderId) {
      throw new BadRequestException(
        'Delivery is no longer available or already assigned',
      );
    }

    const updatedDelivery = await this.prisma.delivery.update({
      where: { id },
      data: {
        riderId: rider.id,
        status: DeliveryStatus.ASSIGNED,
      },
    });

    await this.notificationsService.create({
      userId: delivery.order.userId,
      type: 'DELIVERY',
      title: 'Rider Assigned',
      message: `A rider has accepted your delivery for order #${delivery.order.orderNumber}.`,
      data: JSON.stringify({
        deliveryId: delivery.id,
        riderName: `${rider.user.firstName} ${rider.user.lastName}`,
      }),
    });

    return updatedDelivery;
  }

  private validateStatusTransition(
    currentStatus: DeliveryStatus,
    newStatus: DeliveryStatus,
    isRider: boolean,
    isVendor: boolean,
    isAdmin: boolean,
  ) {
    // Define valid status transitions
    const validTransitions = {
      [DeliveryStatus.PENDING]: [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.CANCELLED,
      ],
      [DeliveryStatus.ASSIGNED]: [
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.CANCELLED,
      ],
      [DeliveryStatus.PICKED_UP]: [
        DeliveryStatus.IN_TRANSIT,
        DeliveryStatus.CANCELLED,
      ],
      [DeliveryStatus.IN_TRANSIT]: [
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
      ],
      [DeliveryStatus.DELIVERED]: [],
      [DeliveryStatus.FAILED]: [DeliveryStatus.PENDING],
      [DeliveryStatus.CANCELLED]: [DeliveryStatus.PENDING],
    };

    // Check if transition is valid
    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private generateTrackingNumber(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let trackingNumber = '';
    for (let i = 0; i < 10; i++) {
      trackingNumber += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return trackingNumber;
  }
}
