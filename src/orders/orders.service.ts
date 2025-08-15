import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { UpdatePaymentStatusDto } from "./dto/update-payment-status.dto";
import { OrderStatus, PaymentStatus } from "@prisma/client";

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const {
      items,
      paymentMethod,
      addressId,
      couponCode,
      notes,
      shippingSelections,
    } = createOrderDto;

    // Check if address exists and belongs to user
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID ${addressId} not found`);
    }

    // Validate products and calculate total
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isPublished: true,
      },
      include: {
        vendor: true,
        inventory: true,
        flashSaleItems: {
          include: {
            flashSale: {
              select: {
                isActive: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        "Some products do not exist or are not published",
      );
    }

    // Check inventory
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product.inventory || product.inventory.quantity < item.quantity) {
        throw new BadRequestException(
          `Product ${product.name} has insufficient inventory`,
        );
      }
    }

    // Group items by vendor
    const itemsByVendor = {};
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      const vendorId = product.vendorId;

      if (!itemsByVendor[vendorId]) {
        itemsByVendor[vendorId] = [];
      }

      itemsByVendor[vendorId].push({
        product,
        quantity: item.quantity,
      });
    }

    // Apply coupon if provided
    let coupon = null;
    if (couponCode) {
      coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon) {
        throw new BadRequestException("Invalid coupon code");
      }

      // Check if coupon is active
      const now = new Date();
      if (!coupon.isActive || coupon.startDate > now || coupon.endDate < now) {
        throw new BadRequestException("Coupon is not active");
      }

      // Check if coupon has reached usage limit
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new BadRequestException("Coupon usage limit reached");
      }
    }

    // Create orders for each vendor
    const orders = [];
    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];

      // Calculate order total
      let orderTotal = 0;
      const orderItems = [];

      for (const { product, quantity } of vendorItems) {
        // Check for flash sale
        const activeFlashSale = product.flashSaleItems.find(
          (fsi) => fsi.flashSale !== null,
        );
        const basePrice = product.discountPrice || product.price;
        const itemPrice = activeFlashSale
          ? basePrice * (1 - activeFlashSale.discountPercentage / 100)
          : basePrice;

        const itemTotal = itemPrice * quantity;
        orderTotal += itemTotal;

        orderItems.push({
          productId: product.id,
          quantity,
          unitPrice: itemPrice,
          totalPrice: itemTotal,
        });
      }

      // Apply coupon discount if applicable
      let discountAmount = 0;
      if (coupon) {
        // Check if coupon is vendor-specific
        if (!coupon.vendorId || coupon.vendorId === vendorId) {
          if (coupon.discountType === "PERCENTAGE") {
            discountAmount = orderTotal * (coupon.discountValue / 100);
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
              discountAmount = coupon.maxDiscount;
            }
          } else {
            discountAmount = coupon.discountValue;
          }

          // Check minimum purchase requirement
          if (coupon.minPurchase && orderTotal < coupon.minPurchase) {
            discountAmount = 0;
          }
        }
      }

      // Apply discount
      orderTotal = Math.max(0, orderTotal - discountAmount);

      // --- NEW SHIPPING LOGIC ---

      const shippingOptionId = shippingSelections[vendorId];
      if (!shippingOptionId) {
        throw new BadRequestException(
          `No shipping option selected for vendor ${vendorId}`,
        );
      }

      const shippingMethod = await this.prisma.shipping.findFirst({
        where: {
          id: shippingOptionId,
          vendorId: vendorId,
        },
      });

      if (!shippingMethod) {
        throw new BadRequestException(
          `Invalid shipping option ID: ${shippingOptionId} for vendor ${vendorId}`,
        );
      }

      const shippingPrice = shippingMethod.price;

      // Add shipping price to the total
      orderTotal += shippingPrice;

      // --- END OF NEW SHIPPING LOGIC ---

      // Generate order number
      const orderNumber = this.generateOrderNumber();

      // Create order
      const order = await this.prisma.order.create({
        data: {
          orderNumber,
          userId,
          vendorId,
          totalAmount: orderTotal,
          shipping: shippingPrice, // Set the shipping field
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod,
          addressId,
          couponId: coupon?.id,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                },
              },
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
            },
          },
          address: true,
        },
      });

      orders.push(order);

      // Update inventory
      for (const { product, quantity } of vendorItems) {
        await this.prisma.inventory.update({
          where: { productId: product.id },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });
      }
    }

    // Update coupon usage if used
    if (coupon) {
      await this.prisma.coupon.update({
        where: { id: coupon.id },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
    }

    return {
      message: "Orders created successfully",
      orders,
    };
  }

  async findAll(
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
      userId,
    };

    if (status) {
      where.status = status;
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllAdmin(params: {
    page: number;
    limit: number;
    status?: string;
    userId?: string;
  }) {
    const { page, limit, status, userId } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findVendorOrders(
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
      throw new ForbiddenException("User is not a vendor");
    }

    // Build where conditions
    const where: any = {
      vendorId: vendor.id,
    };

    if (status) {
      where.status = status;
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                },
              },
            },
          },
          address: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            userId: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              },
            },
          },
        },
        address: true,
        coupon: true,
        delivery: {
          include: {
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
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check if user is authorized to view this order
    if (
      user.role !== "ADMIN" &&
      order.userId !== user.id &&
      order.vendor?.userId !== user.id
    ) {
      throw new ForbiddenException(
        "You do not have permission to view this order",
      );
    }

    return order;
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    user: any,
  ) {
    const { status, notes } = updateOrderStatusDto;

    // Check if order exists
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check if user is authorized to update this order
    if (
      user.role !== "ADMIN" &&
      (user.role !== "VENDOR" || order.vendor?.userId !== user.id)
    ) {
      throw new ForbiddenException(
        "You do not have permission to update this order",
      );
    }

    // Validate status transition
    this.validateStatusTransition(order.status, status);

    // Update order status
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status,
      },
    });

    // Create notification for user
    await this.prisma.notification.create({
      data: {
        userId: order.userId,
        type: "ORDER_STATUS",
        title: "Order Status Updated",
        message: `Your order #${order.orderNumber} has been updated to ${status}${notes ? `: ${notes}` : ""}`,
        data: {
          orderId: order.id,
          status,
        },
      },
    });

    return updatedOrder;
  }

  async updatePaymentStatus(
    id: string,
    updatePaymentStatusDto: UpdatePaymentStatusDto,
  ) {
    const { status, reference } = updatePaymentStatusDto;

    // Check if order exists
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Update payment status
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        paymentStatus: status,
      },
    });

    // Create notification for user
    await this.prisma.notification.create({
      data: {
        userId: order.userId,
        type: "PAYMENT",
        title: "Payment Status Updated",
        message: `Payment for your order #${order.orderNumber} has been ${status.toLowerCase()}${reference ? ` (Ref: ${reference})` : ""}`,
        data: {
          orderId: order.id,
          paymentStatus: status,
          reference,
        },
      },
    });

    return updatedOrder;
  }

  async cancelOrder(id: string, user: any) {
    // Check if order exists
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check if user is authorized to cancel this order
    if (user.role !== "ADMIN" && order.userId !== user.id) {
      throw new ForbiddenException(
        "You do not have permission to cancel this order",
      );
    }

    // Check if order can be cancelled
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PROCESSING
    ) {
      throw new BadRequestException("Order cannot be cancelled at this stage");
    }

    // Update order status
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });

    // Restore inventory
    for (const item of order.items) {
      await this.prisma.inventory.update({
        where: { productId: item.productId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }

    // Create notification for user
    await this.prisma.notification.create({
      data: {
        userId: order.userId,
        type: "ORDER_STATUS",
        title: "Order Cancelled",
        message: `Your order #${order.orderNumber} has been cancelled`,
        data: {
          orderId: order.id,
        },
      },
    });

    return {
      message: "Order cancelled successfully",
      order: updatedOrder,
    };
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ) {
    // Define valid status transitions
    const validTransitions = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
      [OrderStatus.REFUNDED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `ORD-${timestamp.slice(-8)}${random}`;
  }
}
