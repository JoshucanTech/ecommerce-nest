import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const {
      items,
      paymentMethod,
      addressId,
      couponCode,
      notes,
      shippingSelections,
      useUserAddress,
      shippingAddress,
      shippingAddressId,
    } = createOrderDto;

    // Check if address exists and belongs to user
    let address;

    if (useUserAddress) {
      // Get user's default address
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { addresses: { where: { isDefault: true } } },
      });

      if (!user || !user.addresses || user.addresses.length === 0) {
        throw new NotFoundException('User does not have a default address');
      }

      address = user.addresses[0];
    } else if (shippingAddressId) {
      // Get a saved shipping address
      const savedAddress = await this.prisma.shippingAddress.findFirst({
        where: {
          id: shippingAddressId,
          OR: [{ userId }, { sharedWith: { some: { sharedWithId: userId } } }],
        },
      });

      if (!savedAddress) {
        throw new NotFoundException(
          `Saved shipping address with ID ${shippingAddressId} not found`,
        );
      }

      address = savedAddress;
    } else if (addressId) {
      address = await this.prisma.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!address) {
        throw new NotFoundException(`Address with ID ${addressId} not found`);
      }
    } else if (shippingAddress) {
      // Create a temporary address object from shippingAddress
      address = {
        id: null, // This is a temporary address not stored in DB
        ...shippingAddress,
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else {
      throw new BadRequestException(
        'Either useUserAddress, shippingAddressId, addressId, or shippingAddress must be provided',
      );
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
        ProductVariant: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'Some products do not exist or are not published',
      );
    }

    // Check inventory
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);

      // If variant is specified, check variant inventory
      if (item.variantId) {
        const variant = product.ProductVariant.find(
          (v) => v.id === item.variantId,
        );
        if (!variant || variant.quantity < item.quantity) {
          throw new BadRequestException(
            `Product variant ${product.name} has insufficient inventory`,
          );
        }
      } else {
        // Check base product inventory
        if (!product.inventory || product.inventory.quantity < item.quantity) {
          throw new BadRequestException(
            `Product ${product.name} has insufficient inventory`,
          );
        }
      }
    }

    // Group items by vendor and determine shipping zones
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
        variantId: item.variantId,
      });
    }

    // Apply coupon if provided
    let coupon = null;
    let vendorCoupons = {}; // Track which vendors can use the coupon
    if (couponCode) {
      coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (coupon) {
        // Check if coupon is active
        const now = new Date();
        if (
          coupon.isActive &&
          coupon.startDate <= now &&
          coupon.endDate >= now
        ) {
          // Check if coupon has reached usage limit
          if (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) {
            // Determine which vendors can use this coupon
            if (coupon.vendorId) {
              // Coupon is vendor-specific
              vendorCoupons[coupon.vendorId] = coupon;
            } else {
              // Coupon is valid for all vendors
              for (const vendorId in itemsByVendor) {
                vendorCoupons[vendorId] = coupon;
              }
            }
          }
        }
      }
    }

    // Calculate totals for each vendor
    const vendorTotals = {};
    let totalAmount = 0;
    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];
      let vendorTotal = 0;

      for (const { product, quantity, variantId } of vendorItems) {
        // Determine price based on variant or base product
        let unitPrice;
        if (variantId) {
          const variants = product.ProductVariant || [];
          const variant = variants.find((v) => v.id === variantId);
          unitPrice = variant?.discountPrice || variant?.price || product.price;
        } else {
          unitPrice = product.discountPrice || product.price;
        }

        // Check for flash sale
        const flashSaleItems = product.flashSaleItems || [];
        const activeFlashSale = flashSaleItems.find(
          (fsi) => fsi.flashSale !== null && fsi.flashSale.isActive,
        );

        const itemPrice = activeFlashSale
          ? unitPrice * (1 - activeFlashSale.discountPercentage / 100)
          : unitPrice;

        vendorTotal += itemPrice * quantity;
      }

      // Apply coupon discount if applicable
      let discountAmount = 0;
      const vendorCoupon = vendorCoupons[vendorId];
      if (vendorCoupon) {
        if (vendorCoupon.discountType === 'PERCENTAGE') {
          discountAmount = vendorTotal * (vendorCoupon.discountValue / 100);
          if (
            vendorCoupon.maxDiscount &&
            discountAmount > vendorCoupon.maxDiscount
          ) {
            discountAmount = vendorCoupon.maxDiscount;
          }
        } else {
          // Fixed amount discount
          discountAmount = vendorCoupon.discountValue;
          // For fixed amount coupons used across multiple vendors,
          // we should distribute the discount proportionally
          if (!vendorCoupon.vendorId) {
            const totalOrderValueAcrossVendors: any = Object.values(
              itemsByVendor,
            ).reduce((total, vendorItemList: any) => {
              return (
                total +
                vendorItemList.reduce((vendorTotal, item) => {
                  let unitPrice;
                  if (item.variantId) {
                    const variants = item.product.ProductVariant || [];
                    const variant = variants.find(
                      (v) => v.id === item.variantId,
                    );
                    unitPrice =
                      variant?.discountPrice ||
                      variant?.price ||
                      item.product.price;
                  } else {
                    unitPrice =
                      item.product.discountPrice || item.product.price;
                  }

                  const flashSaleItems = item.product.flashSaleItems || [];
                  const activeFlashSale = flashSaleItems.find(
                    (fsi) => fsi.flashSale !== null && fsi.flashSale.isActive,
                  );

                  const itemPrice = activeFlashSale
                    ? unitPrice * (1 - activeFlashSale.discountPercentage / 100)
                    : unitPrice;

                  return vendorTotal + itemPrice * item.quantity;
                }, 0)
              );
            }, 0);

            const vendorOrderValue = vendorItems.reduce((total, item) => {
              let unitPrice;
              if (item.variantId) {
                const variants = item.product.ProductVariant || [];
                const variant = variants.find(
                  (v) => v.id === item.variantId,
                );
                unitPrice =
                  variant?.discountPrice ||
                  variant?.price ||
                  item.product.price;
              } else {
                unitPrice = item.product.discountPrice || item.product.price;
              }

              const flashSaleItems = item.product.flashSaleItems || [];
              const activeFlashSale = flashSaleItems.find(
                (fsi) => fsi.flashSale !== null && fsi.flashSale.isActive,
              );

              const itemPrice = activeFlashSale
                ? unitPrice * (1 - activeFlashSale.discountPercentage / 100)
                : unitPrice;

              return total + itemPrice * item.quantity;
            }, 0);

            // Distribute discount proportionally
            discountAmount =
              vendorCoupon.discountValue *
              (vendorOrderValue / totalOrderValueAcrossVendors);
          }
        }

        // Check minimum purchase requirement
        if (
          vendorCoupon.minPurchase &&
          vendorTotal < vendorCoupon.minPurchase
        ) {
          discountAmount = 0;
        }
      }

      // Apply discount
      vendorTotal = Math.max(0, vendorTotal - discountAmount);

      // Add shipping cost
      const shippingOptionId = shippingSelections[vendorId];
      if (shippingOptionId) {
        const shippingMethod = await this.prisma.shipping.findFirst({
          where: { id: shippingOptionId, Vendor: { some: { id: vendorId } } },
        });
        if (shippingMethod) {
          vendorTotal += shippingMethod.price;
        }
      }

      vendorTotals[vendorId] = vendorTotal;
      totalAmount += vendorTotal;
    }

    // Create payment intent before creating orders
    const paymentIntentDto = {
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        variantId: item.variantId,
      })),
      shippingSelections: shippingSelections || {},
      couponCode,
    };

    const paymentIntent = await this.paymentsService.createPaymentIntent(
      paymentIntentDto,
      userId,
    );

    // Generate a transaction reference to group all orders created together
    const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create orders for each vendor
    const orders = [];
    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];

      // Create order items
      const orderItems = vendorItems.map((item) => {
        const product = item.product;
        let unitPrice;
        if (item.variantId) {
          const variants = product.ProductVariant || [];
          const variant = variants.find((v) => v.id === item.variantId);
          unitPrice = variant?.discountPrice || variant?.price || product.price;
        } else {
          unitPrice = product.discountPrice || product.price;
        }

        // Check for flash sale
        const flashSaleItems = product.flashSaleItems || [];
        const activeFlashSale = flashSaleItems.find(
          (fsi) => fsi.flashSale !== null && fsi.flashSale.isActive,
        );

        const finalPrice = activeFlashSale
          ? unitPrice * (1 - activeFlashSale.discountPercentage / 100)
          : unitPrice;

        return {
          productId: product.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: finalPrice,
          totalPrice: finalPrice * item.quantity,
        };
      });

      // Calculate vendor total
      const vendorTotal = orderItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0,
      );

      // Add shipping cost to vendor total
      const shippingOptionId = shippingSelections[vendorId];
      let shippingCost = 0;
      if (shippingOptionId) {
        const shippingMethod = await this.prisma.shipping.findFirst({
          where: { id: shippingOptionId, Vendor: { some: { id: vendorId } } },
        });
        if (shippingMethod) {
          shippingCost = shippingMethod.price;
        }
      }

      const orderTotal = vendorTotal + shippingCost;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Prepare order data with proper address handling
      const orderData: any = {
        orderNumber,
        totalAmount: orderTotal,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod,
        notes: notes || '',
        userId,
        vendorId,
        transactionRef, // Add transaction reference to group related orders
        items: {
          create: orderItems,
        },
        paymentIntentId: paymentIntent.tx_ref, // Store Flutterwave transaction reference
      };

      // Add the appropriate address based on what was provided
      if (useUserAddress && address.id) {
        orderData.addressId = address.id;
      } else if (shippingAddressId) {
        orderData.shippingAddressId = shippingAddressId;
      } else if (addressId) {
        orderData.addressId = addressId;
      } else if (shippingAddress) {
        // Create a new shipping address first, then reference it
        const newShippingAddress = await this.prisma.shippingAddress.create({
          data: {
            ...shippingAddress,
            userId: userId,
          },
        });
        orderData.shippingAddressId = newShippingAddress.id;
      }

      // Create the order
      const order = await this.prisma.order.create({
        data: orderData,
        include: {
          items: {
            include: {
              product: {
                include: {
                  vendor: true,
                },
              },
              variant: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          vendor: true,
          address: true,
          shippingAddress: true,
        },
      });

      orders.push(order);
    }

    return {
      message:
        'Orders created successfully. Please complete payment to confirm your order.',
      orders,
      paymentIntent,
      transactionRef, // Include transaction reference in response
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
        orderBy: { createdAt: 'desc' },
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
        orderBy: { createdAt: 'desc' },
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
      throw new ForbiddenException('User is not a vendor');
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
        orderBy: { createdAt: 'desc' },
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

  async findByTransactionRef(transactionRef: string, userId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        transactionRef,
        userId: userId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: true,
              },
            },
            variant: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        vendor: true,
        address: true,
        shippingAddress: true,
      },
    });

    if (!orders || orders.length === 0) {
      throw new NotFoundException(
        `No orders found with transaction reference ${transactionRef}`,
      );
    }

    return orders;
  }

  async findGroupedByTransactionRef(
    userId: string,
    params: {
      page: number;
      limit: number;
    },
  ) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // First, get distinct transaction references for this user
    const transactionRefs = await this.prisma.order.groupBy({
      by: ['transactionRef'],
      where: {
        userId,
      },
      orderBy: {
        _max: {
          createdAt: 'desc',
        },
      },
      skip,
      take: limit,
    });

    // Get the actual order data for these transaction references
    const transactionRefsArray = transactionRefs.map(tr => tr.transactionRef);
    
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        transactionRef: {
          in: transactionRefsArray,
        },
      },
      orderBy: [
        { transactionRef: 'asc' },
        { createdAt: 'desc' }
      ],
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
    });

    // Group orders by transactionRef
    const groupedOrders = orders.reduce((acc, order) => {
      if (!acc[order.transactionRef]) {
        acc[order.transactionRef] = [];
      }
      acc[order.transactionRef].push(order);
      return acc;
    }, {});

    // Get total count of distinct transaction references
    const totalCountResult = await this.prisma.$queryRaw`SELECT COUNT(DISTINCT "transactionRef") as count FROM "Order" WHERE "userId" = ${userId}` as Array<{ count: bigint }>;

    const totalCount = Number(totalCountResult[0]?.count || 0);

    return {
      data: groupedOrders,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
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
      user.role !== 'ADMIN' &&
      order.userId !== user.id &&
      order.vendor?.userId !== user.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this order',
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
      user.role !== 'ADMIN' &&
      (user.role !== 'VENDOR' || order.vendor?.userId !== user.id)
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this order',
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
        type: 'ORDER_STATUS',
        title: 'Order Status Updated',
        message: `Your order #${order.orderNumber} has been updated to ${status}${notes ? `: ${notes}` : ''}`,
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
        type: 'PAYMENT',
        title: 'Payment Status Updated',
        message: `Payment for your order #${order.orderNumber} has been ${status.toLowerCase()}${reference ? ` (Ref: ${reference})` : ''}`,
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
    if (user.role !== 'ADMIN' && order.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to cancel this order',
      );
    }

    // Check if order can be cancelled
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PROCESSING
    ) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
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
        type: 'ORDER_STATUS',
        title: 'Order Cancelled',
        message: `Your order #${order.orderNumber} has been cancelled`,
        data: {
          orderId: order.id,
        },
      },
    });

    return {
      message: 'Order cancelled successfully',
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
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }
}
