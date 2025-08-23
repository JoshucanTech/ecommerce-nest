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
        variants: true,
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
      
      // If variant is specified, check variant inventory
      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
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

    // Create orders for each vendor
    const orders = [];
    const paymentIntents = []; // Track payment intents for each vendor order
    
    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];

      // Calculate order total
      let orderTotal = 0;
      const orderItems = [];

      for (const { product, quantity, variantId } of vendorItems) {
        // Determine price based on variant or base product
        let unitPrice;
        if (variantId) {
          const variant = product.variants.find(v => v.id === variantId);
          unitPrice = variant?.discountPrice || variant?.price || product.price;
        } else {
          unitPrice = product.discountPrice || product.price;
        }

        // Check for flash sale
        const activeFlashSale = product.flashSaleItems.find(
          (fsi) => fsi.flashSale !== null && fsi.flashSale.isActive,
        );
        
        const itemPrice = activeFlashSale
          ? unitPrice * (1 - activeFlashSale.discountPercentage / 100)
          : unitPrice;

        const itemTotal = itemPrice * quantity;
        orderTotal += itemTotal;

        orderItems.push({
          productId: product.id,
          productVariantId: variantId,
          quantity,
          unitPrice: itemPrice,
          totalPrice: itemTotal,
        });
      }

      // Apply coupon discount if applicable
      let discountAmount = 0;
      const vendorCoupon = vendorCoupons[vendorId];
      if (vendorCoupon) {
        if (vendorCoupon.discountType === "PERCENTAGE") {
          discountAmount = orderTotal * (vendorCoupon.discountValue / 100);
          if (vendorCoupon.maxDiscount && discountAmount > vendorCoupon.maxDiscount) {
            discountAmount = vendorCoupon.maxDiscount;
          }
        } else {
          // Fixed amount discount
          discountAmount = vendorCoupon.discountValue;
          // For fixed amount coupons used across multiple vendors, 
          // we should distribute the discount proportionally
          if (!vendorCoupon.vendorId) {
            const totalOrderValueAcrossVendors = Object.values(itemsByVendor).reduce((total, vendorItemList) => {
              return total + vendorItemList.reduce((vendorTotal, item) => {
                let unitPrice;
                if (item.variantId) {
                  const variant = item.product.variants.find(v => v.id === item.variantId);
                  unitPrice = variant?.discountPrice || variant?.price || item.product.price;
                } else {
                  unitPrice = item.product.discountPrice || item.product.price;
                }
                
                const activeFlashSale = item.product.flashSaleItems.find(
                  (fsi) => fsi.flashSale !== null && fsi.flashSale.isActive,
                );
                
                const itemPrice = activeFlashSale
                  ? unitPrice * (1 - activeFlashSale.discountPercentage / 100)
                  : unitPrice;
                  
                return vendorTotal + (itemPrice * item.quantity);
              }, 0);
            }, 0);
            
            const vendorOrderValue = vendorItems.reduce((total, item) => {
              let unitPrice;
              if (item.variantId) {
                const variant = item.product.variants.find(v => v.id === item.variantId);
                unitPrice = variant?.discountPrice || variant?.price || item.product.price;
              } else {
                unitPrice = item.product.discountPrice || item.product.price;
              }
              
              const activeFlashSale = item.product.flashSaleItems.find(
                (fsi) => fsi.flashSale !== null && fsi.flashSale.isActive,
              );
              
              const itemPrice = activeFlashSale
                ? unitPrice * (1 - activeFlashSale.discountPercentage / 100)
                : unitPrice;
                
              return total + (itemPrice * item.quantity);
            }, 0);
            
            // Distribute discount proportionally
            discountAmount = vendorCoupon.discountValue * (vendorOrderValue / totalOrderValueAcrossVendors);
          }
        }

        // Check minimum purchase requirement
        if (vendorCoupon.minPurchase && orderTotal < vendorCoupon.minPurchase) {
          discountAmount = 0;
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
          discount: discountAmount, // Track discount applied
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod,
          addressId,
          couponId: vendorCoupon?.id,
          notes,
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
      
      // Create a payment intent for this vendor's order
      paymentIntents.push({
        orderId: order.id,
        vendorId: order.vendorId,
        amount: orderTotal,
        currency: 'usd', // Assuming USD, could be dynamic based on region
      });

      // Update inventory
      for (const { product, quantity, variantId } of vendorItems) {
        if (variantId) {
          // Update variant inventory
          const variant = product.variants.find(v => v.id === variantId);
          if (variant) {
            await this.prisma.productVariant.update({
              where: { id: variantId },
              data: {
                quantity: {
                  decrement: quantity,
                },
              },
            });
          }
        } else {
          // Update base product inventory
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
      paymentIntents, // Return payment intents for frontend processing
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
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `ORD-${timestamp}-${random}`;
  }

}
