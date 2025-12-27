import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdPaymentDto } from './dto/create-ad-payment.dto';
import { UpdateAdPaymentDto } from './dto/update-ad-payment.dto';
import { PaymentStatus } from '@prisma/client';
@Injectable()
export class AdPaymentsService {
  private readonly logger = new Logger(AdPaymentsService.name);
  constructor(private prisma: PrismaService) {}

  async create(createAdPaymentDto: CreateAdPaymentDto) {
    const {
      advertisementId,
      amount,
      paymentMethod,
      currency = 'USD',
    } = createAdPaymentDto;

    // Verify advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id: advertisementId },
    });

    if (!advertisement) {
      throw new NotFoundException(
        `Advertisement with ID ${advertisementId} not found`,
      );
    }

    // Create payment record
    const payment = await this.prisma.adPayment.create({
      data: {
        advertisementId,
        amount,
        paymentMethod,
        currency,
        status: 'PENDING',
      },
    });

    // Process payment (in a real app, this would integrate with a payment gateway)
    const processedPayment = await this.processPayment(payment.id);

    return processedPayment;
  }

  async findAll(vendorId?: string) {
    let query = {};

    if (vendorId) {
      query = {
        advertisement: {
          vendorId,
        },
      };
    }

    return this.prisma.adPayment.findMany({
      where: query,
      include: {
        advertisement: {
          select: {
            title: true,
            type: true,
            vendor: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.adPayment.findUnique({
      where: { id },
      include: {
        advertisement: {
          select: {
            title: true,
            type: true,
            vendor: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(id: string, updateAdPaymentDto: UpdateAdPaymentDto) {
    const payment = await this.prisma.adPayment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Only allow updates to certain fields based on payment status
    if (
      payment.status === 'COMPLETED' &&
      updateAdPaymentDto.status !== 'REFUNDED'
    ) {
      throw new BadRequestException(
        'Cannot update a completed payment unless refunding',
      );
    }

    return this.prisma.adPayment.update({
      where: { id },
      data: updateAdPaymentDto,
    });
  }

  async remove(id: string) {
    const payment = await this.prisma.adPayment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Only allow deletion of pending payments
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Cannot delete a processed payment');
    }

    return this.prisma.adPayment.delete({
      where: { id },
    });
  }

  async getVendorPaymentSummary(vendorId: string) {
    // Get all ads for the vendor
    const ads = await this.prisma.advertisement.findMany({
      where: {
        vendorId,
      },
      select: {
        id: true,
      },
    });

    const adIds = ads.map((ad) => ad.id);

    // Get payment summary
    const payments = await this.prisma.adPayment.findMany({
      where: {
        advertisementId: {
          in: adIds,
        },
      },
    });

    // Calculate summary metrics
    const totalSpend = payments.reduce((sum, payment) => {
      if (payment.status === 'COMPLETED') {
        return sum + payment.amount;
      }
      return sum;
    }, 0);

    const pendingPayments = payments.filter(
      (payment) => payment.status === 'PENDING',
    );
    const pendingAmount = pendingPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    const completedPayments = payments.filter(
      (payment) => payment.status === 'COMPLETED',
    );
    const completedAmount = completedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    const refundedPayments = payments.filter(
      (payment) => payment.status === 'REFUNDED',
    );
    const refundedAmount = refundedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    // Get monthly spend for the last 12 months
    const today = new Date();
    const monthlySpend = [];

    for (let i = 0; i < 12; i++) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const nextMonth = new Date(
        today.getFullYear(),
        today.getMonth() - i + 1,
        0,
      );

      const monthlyPayments = payments.filter((payment) => {
        const paymentDate = new Date(payment.createdAt);
        return (
          payment.status === 'COMPLETED' &&
          paymentDate >= month &&
          paymentDate <= nextMonth
        );
      });

      const monthlyTotal = monthlyPayments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );

      monthlySpend.unshift({
        month: month.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        }),
        amount: monthlyTotal,
      });
    }

    return {
      totalSpend,
      pendingAmount,
      completedAmount,
      refundedAmount,
      paymentCount: payments.length,
      pendingCount: pendingPayments.length,
      completedCount: completedPayments.length,
      refundedCount: refundedPayments.length,
      monthlySpend,
    };
  }

  private async processPayment(paymentId: string) {
    // In a real application, this would integrate with a payment gateway
    // For now, we'll simulate a successful payment after a short delay

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update payment status to COMPLETED
    return this.prisma.adPayment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });
  }

  async processWebhook(payload: any, signature: string) {
    this.logger.log(
      `Processing payment webhook with signature: ${signature.substring(0, 10)}...`,
    );

    try {
      // Verify webhook signature (in a real app, this would validate against a secret)
      this.verifyWebhookSignature(payload, signature);

      const { event, data } = payload;

      switch (event) {
        case 'payment.succeeded':
          await this.handlePaymentSucceeded(data);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(data);
          break;
        case 'payment.refunded':
          await this.handlePaymentRefunded(data);
          break;
        case 'payment.disputed':
          await this.handlePaymentDisputed(data);
          break;
        default:
          this.logger.warn(`Unhandled webhook event: ${event}`);
      }

      return { success: true, event };
    } catch (error) {
      this.logger.error(
        `Error processing webhook: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Invalid webhook payload: ${error.message}`,
      );
    }
  }

  private verifyWebhookSignature(payload: any, signature: string) {
    // In a real application, this would verify the signature using a shared secret
    // For example, with Stripe:
    // const stripeWebhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET')
    // const event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret)

    // For now, we'll just do a basic check
    if (!signature || signature.length < 10) {
      throw new BadRequestException('Invalid webhook signature');
    }

    return true;
  }

  private async handlePaymentSucceeded(data: any) {
    const { paymentId, transactionReference } = data;

    // Find the payment in our system
    const payment = await this.prisma.adPayment.findFirst({
      where: {
        OR: [{ id: paymentId }, { transactionReference }],
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment not found: ${paymentId || transactionReference}`,
      );
    }

    // Update payment status
    await this.prisma.adPayment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        transactionReference:
          transactionReference || payment.transactionReference,
      },
    });

    // Update advertisement status if needed
    await this.prisma.advertisement.update({
      where: { id: payment.advertisementId },
      data: {
        status: 'ACTIVE',
      },
    });

    // Create notification for vendor
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id: payment.advertisementId },
      select: {
        vendorId: true,
        title: true,
      },
    });

    if (advertisement) {
      await this.prisma.notification.create({
        data: {
          userId: advertisement.vendorId,
          title: 'Payment Successful',
          message: `Payment for advertisement "${advertisement.title}" has been processed successfully.`,
          type: 'PAYMENT',
          data: {
            paymentId: payment.id,
            redirectUrl: `/dashboard/advertisements/${payment.advertisementId}`,
          },
        },
      });
    }
  }

  private async handlePaymentFailed(data: any) {
    const { paymentId, transactionReference, reason } = data;

    // Find the payment in our system
    const payment = await this.prisma.adPayment.findFirst({
      where: {
        OR: [{ id: paymentId }, { transactionReference }],
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment not found: ${paymentId || transactionReference}`,
      );
    }

    // Update payment status
    await this.prisma.adPayment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        notes: reason || 'Payment processing failed',
      },
    });

    // Create notification for vendor
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id: payment.advertisementId },
      select: {
        vendorId: true,
        title: true,
      },
    });

    if (advertisement) {
      await this.prisma.notification.create({
        data: {
          userId: advertisement.vendorId,
          title: 'Payment Failed',
          message: `Payment for advertisement "${advertisement.title}" has failed. Reason: ${reason || 'Unknown error'}`,
          type: 'PAYMENT',
          data: {
            paymentId: payment.id,
            redirectUrl: `/dashboard/advertisements/${payment.advertisementId}/payments`,
          },
        },
      });
    }
  }

  private async handlePaymentRefunded(data: any) {
    const { paymentId, transactionReference, amount } = data;

    // Find the payment in our system
    const payment = await this.prisma.adPayment.findFirst({
      where: {
        OR: [{ id: paymentId }, { transactionReference }],
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment not found: ${paymentId || transactionReference}`,
      );
    }

    // Update payment status
    await this.prisma.adPayment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        refundedAmount: amount || payment.amount,
        refundedAt: new Date(),
      },
    });

    // Create notification for vendor
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id: payment.advertisementId },
      select: {
        vendorId: true,
        title: true,
      },
    });

    if (advertisement) {
      await this.prisma.notification.create({
        data: {
          userId: advertisement.vendorId,
          title: 'Payment Refunded',
          message: `Payment for advertisement "${advertisement.title}" has been refunded.`,
          type: 'PAYMENT',
          data: {
            paymentId: payment.id,
            redirectUrl: `/dashboard/advertisements/${payment.advertisementId}/payments`,
          },
        },
      });
    }
  }

  private async handlePaymentDisputed(data: any) {
    const { paymentId, transactionReference, reason } = data;

    // Find the payment in our system
    const payment = await this.prisma.adPayment.findFirst({
      where: {
        OR: [{ id: paymentId }, { transactionReference }],
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment not found: ${paymentId || transactionReference}`,
      );
    }

    // Update payment status
    await this.prisma.adPayment.update({
      where: { id: payment.id },
      data: {
        status: 'DISPUTED',
        notes: `Dispute reason: ${reason || 'Not provided'}`,
      },
    });

    // Create notification for admin and vendor
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id: payment.advertisementId },
      select: {
        vendorId: true,
        title: true,
      },
    });

    if (advertisement) {
      // Notify vendor
      await this.prisma.notification.create({
        data: {
          userId: advertisement.vendorId,
          title: 'Payment Disputed',
          message: `Payment for advertisement "${advertisement.title}" has been disputed. Reason: ${reason || 'Not provided'}`,
          type: 'PAYMENT',
          data: {
            paymentId: payment.id,
            redirectUrl: `/dashboard/advertisements/${payment.advertisementId}/payments`,
          },
        },
      });

      // Notify admin (assuming admin user ID is available)
      const adminUsers = await this.prisma.user.findMany({
        where: {
          role: 'ADMIN',
        },
        select: {
          id: true,
        },
      });

      for (const admin of adminUsers) {
        await this.prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Payment Dispute',
            message: `A payment dispute has been filed for advertisement "${advertisement.title}". Reason: ${reason || 'Not provided'}`,
            type: 'PAYMENT',
            data: {
              paymentId: payment.id,
              redirectUrl: `/dashboard/advertisements/${payment.advertisementId}/payments`,
            },
          },
        });
      }
    }
  }

  async calculateAdCost(
    advertisementId: string,
    duration: number,
    targetViews: number,
    targetClicks: number,
  ) {
    // Get advertisement details
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id: advertisementId },
      include: {
        platformConfigs: true,
      },
    });

    if (!advertisement) {
      throw new NotFoundException(
        `Advertisement with ID ${advertisementId} not found`,
      );
    }

    // Base cost calculation
    let baseCost = 0;

    // Calculate cost based on platform rates
    advertisement.platformConfigs.forEach((config) => {
      // Different platforms might have different rate structures
      switch (config.platform) {
        case 'FACEBOOK':
        case 'INSTAGRAM':
          baseCost += targetViews * 0.001 + targetClicks * 0.05;
          break;
        case 'TWITTER':
          baseCost += targetViews * 0.0015 + targetClicks * 0.06;
          break;
        case 'GOOGLE_ADSENSE':
          baseCost += targetViews * 0.002 + targetClicks * 0.07;
          break;
        case 'WHATSAPP':
          baseCost += targetViews * 0.003 + targetClicks * 0.08;
          break;
        case 'IN_APP':
          baseCost += targetViews * 0.0005 + targetClicks * 0.03;
          break;
        default:
          baseCost += targetViews * 0.001 + targetClicks * 0.05;
      }
    });

    // Adjust cost based on duration (longer duration might get a discount)
    const durationFactor =
      duration <= 7 ? 1 : duration <= 14 ? 0.95 : duration <= 30 ? 0.9 : 0.85;

    // Calculate final cost
    const finalCost = baseCost * durationFactor;

    return {
      advertisementId,
      baseCost,
      durationFactor,
      finalCost: Number.parseFloat(finalCost.toFixed(2)),
      currency: 'USD',
      duration,
      targetViews,
      targetClicks,
    };
  }
}
