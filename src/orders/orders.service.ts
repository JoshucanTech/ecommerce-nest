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
import { RedisService } from '../redis/redis.service';
import { Cacheable } from '../redis/cache.decorator';
import { CacheInvalidate } from '../redis/cache-invalidate.decorator';
import { AddressService } from '../users/address.service';
import { ProductValidationService } from '../products/product-validation.service';
import { CouponsService } from '../promotions/coupons.service';
import { ShippingCostService } from '../shipping/shipping-cost.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private redisService: RedisService,
    private addressService: AddressService,
    private productValidationService: ProductValidationService,
    private couponsService: CouponsService,
    private shippingCostService: ShippingCostService,
  ) {}

  @CacheInvalidate('order:', 'user-orders:')
  async create(createOrderDto: CreateOrderDto, userId: string) {
    // Extract and validate address information
    const address = await this.addressService.resolveAddress(
      createOrderDto,
      userId,
    );

    // Validate products and check inventory
    const { products, validationErrors } =
      await this.productValidationService.validateProductsAndInventory(
        createOrderDto.items,
      );

    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors.join(', '));
    }

    // Group items by vendor
    const itemsByVendor = this.groupItemsByVendor(
      createOrderDto.items,
      products,
    );

    // Process coupons if provided
    const processedCoupons = createOrderDto.couponCode
      ? await this.couponsService.processCoupons(
          createOrderDto.couponCode,
          itemsByVendor,
        )
      : null;

    // Calculate vendor totals with discounts and shipping costs
    const vendorCalculations = await this.calculateVendorTotals(
      itemsByVendor,
      processedCoupons,
      createOrderDto.shippingSelections,
    );

    // Create payment intent before creating orders
    const paymentIntent = await this.paymentsService.createPaymentIntent(
      {
        items: createOrderDto.items,
        shippingSelections: createOrderDto.shippingSelections || {},
        couponCode: createOrderDto.couponCode,
      },
      userId,
    );

    // Generate a transaction reference to group all orders created together
    const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create orders for each vendor
    const orders = await this.createVendorOrders({
      itemsByVendor,
      vendorCalculations,
      createOrderDto,
      userId,
      address,
      paymentIntent,
      transactionRef,
    });

    return {
      message:
        'Orders created successfully. Please complete payment to confirm your order.',
      orders,
      paymentIntent,
      transactionRef,
    };
  }

  /**
   * Group order items by vendor ID
   */
  private groupItemsByVendor(items: OrderItemDto[], products: any[]) {
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
    return itemsByVendor;
  }

  /**
   * Calculate totals for each vendor including discounts and shipping costs
   */
  private async calculateVendorTotals(
    itemsByVendor: any,
    processedCoupons: any,
    shippingSelections: Record<string, string>,
  ) {
    const vendorTotals = {};
    let totalAmount = 0;

    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];
      let vendorTotal = 0;

      // Calculate item prices
      for (const { product, quantity, variantId } of vendorItems) {
        const unitPrice = this.productValidationService.calculateProductPrice(
          product,
          variantId,
        );
        vendorTotal += unitPrice * quantity;
      }

      // Apply coupon discount if applicable
      let discountAmount = 0;
      if (processedCoupons && processedCoupons.vendorCoupons[vendorId]) {
        const vendorCoupon = processedCoupons.vendorCoupons[vendorId];
        const totalOrderValueAcrossVendors =
          processedCoupons.totalOrderValueAcrossVendors;
        const vendorOrderValue = processedCoupons.vendorOrderValues[vendorId];

        discountAmount = this.couponsService.calculateDiscount(
          vendorCoupon,
          vendorTotal,
          vendorOrderValue,
          totalOrderValueAcrossVendors,
        );
      }

      // Apply discount
      vendorTotal = Math.max(0, vendorTotal - discountAmount);

      // Add shipping cost
      const shippingOptionId = shippingSelections[vendorId];
      if (shippingOptionId) {
        const shippingCost = await this.shippingCostService.getShippingCost(
          shippingOptionId,
          vendorId,
        );
        vendorTotal += shippingCost;
      }

      vendorTotals[vendorId] = vendorTotal;
      totalAmount += vendorTotal;
    }

    return { vendorTotals, totalAmount };
  }

  /**
   * Create individual orders for each vendor
   */
  private async createVendorOrders(options: {
    itemsByVendor: any;
    vendorCalculations: any;
    createOrderDto: CreateOrderDto;
    userId: string;
    address: any;
    paymentIntent: any;
    transactionRef: string;
  }) {
    const {
      itemsByVendor,
      vendorCalculations,
      createOrderDto,
      userId,
      address,
      paymentIntent,
      transactionRef,
    } = options;

    const orders = [];

    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];

      // Create order items
      const orderItems = vendorItems.map((item) => {
        const product = item.product;
        const unitPrice = this.productValidationService.calculateProductPrice(
          product,
          item.variantId,
        );

        return {
          productId: product.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: unitPrice,
          totalPrice: unitPrice * item.quantity,
        };
      });

      // Calculate vendor total (subtotal)
      const vendorTotal = orderItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0,
      );

      // Add shipping cost to vendor total
      const shippingOptionId = createOrderDto.shippingSelections[vendorId];
      let shippingCost = 0;
      if (shippingOptionId) {
        shippingCost = await this.shippingCostService.getShippingCost(
          shippingOptionId,
          vendorId,
        );
      }

      // Subtotal is the sum of all items before shipping
      const subtotal = vendorTotal;
      const orderTotal = vendorTotal + shippingCost;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Prepare order data with proper address handling
      const orderData: any = {
        orderNumber,
        totalAmount: orderTotal,
        subtotal: subtotal,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: createOrderDto.paymentMethod,
        notes: createOrderDto.notes || '',
        userId,
        vendorId,
        transactionRef,
        shippingCost,
        items: {
          create: orderItems,
        },
        paymentIntentId: paymentIntent.tx_ref,
      };

      // Add the appropriate address based on what was provided
      if (createOrderDto.useUserAddress && address.id) {
        orderData.addressId = address.id;
      } else if (createOrderDto.shippingAddressId) {
        orderData.shippingAddressId = createOrderDto.shippingAddressId;
      } else if (createOrderDto.addressId) {
        orderData.addressId = createOrderDto.addressId;
      } else if (createOrderDto.shippingAddress) {
        // Create a new shipping address first, then reference it
        const newShippingAddress = await this.prisma.shippingAddress.create({
          data: {
            ...createOrderDto.shippingAddress,
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

    return orders;
  }

  @Cacheable(300, 'user-orders')
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

  @Cacheable(300, 'admin-orders')
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

  @Cacheable(300, 'vendor-orders')
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

  @Cacheable(300, 'transaction-orders')
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

    // Get all the order data in a single query with proper ordering
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
      },
      orderBy: [
        // Order by max createdAt per transactionRef in descending order (newest first)
        // This is a simplification - true group-wise ordering would require a more complex query
        { createdAt: 'desc' },
        // Then order by transactionRef and createdAt within each group
        { transactionRef: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
        address: true,
        shippingAddress: true,
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

    // Extract unique transaction references while maintaining order
    const uniqueTransactionRefs = Array.from(
      new Set(orders.map((order) => order.transactionRef)),
    );

    // Apply pagination to the grouped results
    const paginatedRefs = uniqueTransactionRefs.slice(skip, skip + limit);

    // Create a new object with only the paginated groups
    const paginatedGroupedOrders = {};
    for (const ref of paginatedRefs) {
      paginatedGroupedOrders[ref] = groupedOrders[ref];
    }

    // Calculate counts from the already fetched data
    const totalCount = uniqueTransactionRefs.length;

    // Calculate recent orders (within last 7 days) from already fetched data
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentTransactionRefs = Array.from(
      new Set(
        orders
          .filter((order) => order.createdAt >= oneWeekAgo)
          .map((order) => order.transactionRef),
      ),
    );

    const recentCount = recentTransactionRefs.length;

    return {
      data: paginatedGroupedOrders,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        recent_orders: recentCount,
      },
    };
  }

  @Cacheable(600, 'order')
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

  @CacheInvalidate('order:', 'user-orders:', 'vendor-orders:', 'admin-orders:')
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

  @CacheInvalidate('order:', 'user-orders:', 'vendor-orders:', 'admin-orders:')
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

  @CacheInvalidate('order:', 'user-orders:', 'vendor-orders:', 'admin-orders:')
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
