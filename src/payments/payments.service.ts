// backend/src/payments/payments.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import  { PrismaService } from "../prisma/prisma.service";
import {
  CreatePaymentDto,
  CreateOrderPaymentDto,
  CreateRiderPaymentDto,
  CreateFeaturePaymentDto,
} from "./dto/create-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { PaymentStatus, UserRole, PaymentMethod } from "@prisma/client";

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto, userId: string) {
    const { entityId, paymentType, ...paymentData } = createPaymentDto;

    // Validate payment type and perform specific actions
    switch (paymentType) {
      case "ORDER":
        return this.createOrderPayment(userId, {
          ...paymentData,
          orderId: entityId,
        } as CreateOrderPaymentDto);
      case "RIDER_PAYMENT":
        return this.createRiderPayment(userId, {
          ...paymentData,
          riderId: entityId,
        } as CreateRiderPaymentDto);
      case "FEATURE_PAYMENT":
        return this.createFeaturePayment(userId, {
          ...paymentData,
          featureId: entityId,
        } as CreateFeaturePaymentDto);
      default:
        throw new BadRequestException("Invalid payment type");
    }
  }

  private async createOrderPayment(
    userId: string,
    createOrderPaymentDto: CreateOrderPaymentDto,
  ) {
    const {
      orderId,
      amount,
      method,
      transactionReference,
      status,
      paymentType,
    } = createOrderPaymentDto;

    // Verify the order exists and belongs to the user
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException(
        "You can only create payments for your own orders",
      );
    }

    // Create the payment
    return this.prisma.payment.create({
      data: {
        orderId,
        userId,
        amount,
        method,
        transactionReference,
        status,
        paymentType,
      },
    });
  }

  private async createRiderPayment(
    userId: string,
    createRiderPaymentDto: CreateRiderPaymentDto,
  ) {
    const {
      riderId,
      amount,
      method,
      transactionReference,
      status,
      paymentType,
    } = createRiderPaymentDto;

    // Verify the rider exists
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${riderId} not found`);
    }

    // Create the payment
    return this.prisma.payment.create({
      data: {
        riderId,
        userId,
        amount,
        method,
        transactionReference,
        status,
        paymentType,
      },
    });
  }

  private async createFeaturePayment(
    userId: string,
    createFeaturePaymentDto: CreateFeaturePaymentDto,
  ) {
    const {
      featureId,
      amount,
      method,
      transactionReference,
      status,
      paymentType,
    } = createFeaturePaymentDto;

    // In a real app, you'd validate the feature and its pricing here
    // For example, check if the feature exists and the amount is correct

    // Create the payment
    return this.prisma.payment.create({
      data: {
        userId,
        amount,
        method,
        transactionReference,
        status,
        details: { featureId }, // Store feature ID in details
        paymentType,
      },
    });
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip,
        take: limit,
        include: {
          order: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.payment.count(),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findUserPayments(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          order: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Get the cu user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    }) ?? { role: "", id: "" };

    // Check if the user is authorized to view this payment
    if (user.role !== UserRole.ADMIN && payment.userId !== user.id) {
      throw new ForbiddenException("You can only view your own payments");
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    // Check if payment exists
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Update payment
    return this.prisma.payment.update({
      where: { id },
      data: updatePaymentDto,
    });
  }

  async remove(id: string) {
    // Check if payment exists
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return this.prisma.payment.delete({
      where: { id },
    });
  }

  async processWebhook(webhookData: any) {
    // Process webhook data from payment provider
    // This is a simplified example - in a real application, you would:
    // 1. Verify the webhook signature
    // 2. Parse the webhook data based on the payment provider's format
    // 3. Update the payment status accordingly

    if (!webhookData.paymentId) {
      return { success: false, message: "Invalid webhook data" };
    }

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: webhookData.paymentId },
      });

      if (!payment) {
        return { success: false, message: "Payment not found" };
      }

      // Update payment status based on webhook data
      const updatedPayment = await this.prisma.payment.update({
        where: { id: webhookData.paymentId },
        data: {
          status:
            webhookData.status === "succeeded"
              ? PaymentStatus.COMPLETED
              : webhookData.status === "failed"
                ? PaymentStatus.FAILED
                : PaymentStatus.PENDING,
          transactionReference:
            webhookData.transactionId || payment.transactionReference,
        },
      });

      // If payment is completed, update the order status
      if (
        updatedPayment.status === PaymentStatus.COMPLETED &&
        updatedPayment.orderId
      ) {
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PaymentStatus.COMPLETED },
        });
      }

      return { success: true, payment: updatedPayment };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}