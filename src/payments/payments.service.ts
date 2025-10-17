import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { GenericPaymentDto, PaymentPurpose } from './dto/generic-payment.dto';
import { v4 as uuidv4 } from 'uuid';
import { FlutterwaveService } from './flutterwave.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private flutterwaveService: FlutterwaveService,
    private configService: ConfigService,
  ) {}

  async createPaymentIntent(
    createPaymentIntentDto: CreatePaymentIntentDto,
    userId: string,
  ) {
    const { items, shippingSelections, couponCode } = createPaymentIntentDto;

    let totalAmount = 0;

    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        ProductVariant: true,
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
    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];
      let vendorTotal = 0;

      for (const { product, quantity, variantId } of vendorItems) {
        // Determine price based on variant or base product
        let unitPrice;
        if (variantId) {
          // Ensure variants array exists before calling find
          const variants = product.ProductVariant || [];
          const variant = variants.find((v) => v.id === variantId);
          unitPrice = variant?.discountPrice || variant?.price || product.price;
        } else {
          unitPrice = product.discountPrice || product.price;
        }

        // Check for flash sale
        // Ensure flashSaleItems array exists before calling find
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
                    // Ensure variants array exists before calling find
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

                  // Ensure flashSaleItems array exists before calling find
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
                // Ensure variants array exists before calling find
                const variants = item.product.ProductVariant || [];
                const variant = variants.find((v) => v.id === item.variantId);
                unitPrice =
                  variant?.discountPrice ||
                  variant?.price ||
                  item.product.price;
              } else {
                unitPrice = item.product.discountPrice || item.product.price;
              }

              // Ensure flashSaleItems array exists before calling find
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

    // Fetch user email for Flutterwave
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || !user.email) {
      throw new NotFoundException('User email not found for payment initiation.');
    }

    const tx_ref = `FLW-${uuidv4()}`;
    const redirect_url = this.configService.get<string>('FLUTTERWAVE_REDIRECT_URL') || 'http://localhost:3000/checkout/payment-status'; // Placeholder
    const currency = this.configService.get<string>('FLUTTERWAVE_CURRENCY') || 'USD'; // Placeholder

    const flutterwaveResponse = await this.flutterwaveService.initiatePayment(
      totalAmount,
      currency,
      user.email,
      tx_ref,
      redirect_url,
      { userId, purpose: PaymentPurpose.ORDER }, // Metadata
    );

    if (!flutterwaveResponse || !flutterwaveResponse.data || !flutterwaveResponse.data.link) {
      throw new BadRequestException('Failed to get Flutterwave checkout link.');
    }

    return {
      clientSecret: flutterwaveResponse.data.link, // Flutterwave checkout URL
      totalAmount: Math.round(totalAmount * 100), // Amount in cents
      vendorTotals: Object.keys(vendorTotals).reduce((acc, vendorId) => {
        acc[vendorId] = Math.round(vendorTotals[vendorId] * 100);
        return acc;
      }, {}),
      tx_ref, // Return transaction reference for frontend to store/use
    };
  }

  async processGenericPayment(paymentDto: GenericPaymentDto, userId: string) {
    // In a real application, you would use a payment provider like Stripe.
    // Here, we'll simulate the process.

    const { amount, currency, purpose, description, metadata, referenceId } =
      paymentDto;

    // Validate the amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Validate the currency
    if (!currency || currency.length !== 3) {
      throw new BadRequestException('Invalid currency code');
    }

    // Process the payment based on its purpose
    let paymentResult;
    switch (purpose) {
      case PaymentPurpose.ORDER:
        // Handle order payment
        paymentResult = await this.processOrderPayment(paymentDto, userId);
        break;
      case PaymentPurpose.SUBSCRIPTION:
        // Handle subscription payment
        paymentResult = await this.processSubscriptionPayment(
          paymentDto,
          userId,
        );
        break;
      case PaymentPurpose.DONATION:
        // Handle donation payment
        paymentResult = await this.processDonationPayment(paymentDto, userId);
        break;
      case PaymentPurpose.WALLET_TOPUP:
        // Handle wallet top-up payment
        paymentResult = await this.processWalletTopupPayment(
          paymentDto,
          userId,
        );
        break;
      default:
        // Handle other payments
        paymentResult = await this.processGeneralPayment(paymentDto, userId);
        break;
    }

    // Simulate creating a payment intent with a unique client secret.
    const clientSecret = `pi_${uuidv4().replace(/-/g, '')}_secret_${uuidv4().replace(/-/g, '')}`;

    return {
      clientSecret,
      amount,
      currency,
      purpose,
      description,
      referenceId,
      metadata,
      ...paymentResult,
    };
  }

  async handleWebhook(eventData: any, signature: string) {
    // In a real implementation, you would:
    // 1. Verify the webhook signature to ensure it's from a trusted source
    // 2. Parse the event data to determine the type of event
    // 3. Handle different event types appropriately

    try {
      // Verify webhook signature (example with Stripe)
      // const event = stripe.webhooks.constructEvent(
      //   JSON.stringify(eventData),
      //   signature,
      //   process.env.STRIPE_WEBHOOK_SECRET
      // );

      // For simulation, we'll just log the event
      console.log('Webhook received:', eventData);

      // Handle different event types
      switch (eventData.type) {
        case 'payment_intent.succeeded':
          // Update order status to confirmed
          await this.handlePaymentSuccess(eventData.data.object);
          break;

        case 'payment_intent.payment_failed':
          // Update order status to failed
          const orderId = eventData.data.object.metadata?.orderId;
          if (orderId) {
            await this.handlePaymentFailure(orderId, eventData.data.object);
          }
          break;

        default:
          console.log(`Unhandled event type: ${eventData.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw new BadRequestException('Webhook error');
    }
  }

  async handleFlutterwaveWebhook(body: any, signature: string) {
    const secretHash = this.configService.get<string>('FLUTTERWAVE_SECRET_HASH');

    if (!secretHash || signature !== secretHash) {
      throw new BadRequestException('Invalid Flutterwave webhook signature');
    }

    // Flutterwave sends a 'charge.completed' event for successful transactions
    // and other events for failures or other states.
    // The actual transaction details are in body.data
    const event = body.event;
    const transactionData = body.data;

    if (event === 'charge.completed' && transactionData.status === 'successful') {
      // Payment was successful
      await this.handleFlutterwavePaymentSuccess(transactionData);
    } else if (transactionData.status === 'failed') {
      // Payment failed
      await this.handleFlutterwavePaymentFailure(transactionData);
    } else {
      console.log(`Unhandled Flutterwave event or status: ${event} - ${transactionData.status}`);
    }

    return { received: true };
  }

  private async handleFlutterwavePaymentSuccess(transactionData: any) {
    const tx_ref = transactionData.tx_ref;
    if (tx_ref) {
      // Verify the transaction with Flutterwave to be absolutely sure
      const verificationResponse = await this.flutterwaveService.verifyPayment(transactionData.id);

      if (verificationResponse && verificationResponse.data && verificationResponse.data.status === 'successful') {
        // Update order status to confirmed and payment status to completed
        // We need to pass the tx_ref to the OrdersService to update the order(s)
        // associated with this transaction reference.
        // This assumes that tx_ref is stored as paymentIntentId in the Order model.
        await this.prisma.order.updateMany({
          where: { paymentIntentId: tx_ref },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'COMPLETED',
          },
        });
        console.log(`Order(s) with tx_ref ${tx_ref} confirmed and payment marked as completed.`);
      } else {
        console.error(`Flutterwave payment verification failed for tx_ref: ${tx_ref}`);
        // Optionally, update order status to failed or pending review
        await this.prisma.order.updateMany({
          where: { paymentIntentId: tx_ref },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'FAILED',
          },
        });
      }
    }
  }

  private async handleFlutterwavePaymentFailure(transactionData: any) {
    const tx_ref = transactionData.tx_ref;
    if (tx_ref) {
      // Update order status to cancelled and payment status to failed
      await this.prisma.order.updateMany({
        where: { paymentIntentId: tx_ref },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
        },
      });
      console.log(`Order(s) with tx_ref ${tx_ref} marked as cancelled due to payment failure.`);
    }
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    // In a real implementation, you would:
    // 1. Find the order associated with this payment intent
    // 2. Update the order status to confirmed
    // 3. Update payment status to paid
    // 4. Trigger any fulfillment processes

    const orderId = paymentIntent.metadata?.orderId;
    if (orderId) {
      // Update order in database
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED', // This should be a valid OrderStatus
          paymentStatus: 'COMPLETED', // Changed from 'PAID' to 'COMPLETED' to match the enum
          paymentIntentId: paymentIntent.id,
        },
      });

      console.log(`Order ${orderId} confirmed and payment marked as paid`);
    }
  }

  async handlePaymentFailure(orderId: string, paymentIntent: any) {
    // Handle payment failure
    try {
      // Update order in database
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED', // Changed from 'FAILED' to 'CANCELLED' to match the enum
          paymentStatus: 'FAILED',
          paymentIntentId: paymentIntent.id,
        },
      });

      console.log(`Order ${orderId} marked as failed due to payment failure`);
    } catch (error) {
      console.error('Payment failure handling error:', error);
      throw new BadRequestException('Payment failure handling error');
    }
  }

  private async processOrderPayment(
    paymentDto: GenericPaymentDto,
    userId: string,
  ) {
    // Specific logic for processing order payments
    // This would typically involve creating or updating an order in the database
    return {
      status: 'requires_confirmation',
      paymentType: 'order',
    };
  }

  private async processSubscriptionPayment(
    paymentDto: GenericPaymentDto,
    userId: string,
  ) {
    // Specific logic for processing subscription payments
    return {
      status: 'requires_confirmation',
      paymentType: 'subscription',
    };
  }

  private async processDonationPayment(
    paymentDto: GenericPaymentDto,
    userId: string,
  ) {
    // Specific logic for processing donation payments
    return {
      status: 'requires_confirmation',
      paymentType: 'donation',
    };
  }

  private async processWalletTopupPayment(
    paymentDto: GenericPaymentDto,
    userId: string,
  ) {
    // Specific logic for processing wallet top-up payments
    return {
      status: 'requires_confirmation',
      paymentType: 'wallet_topup',
    };
  }

  private async processGeneralPayment(
    paymentDto: GenericPaymentDto,
    userId: string,
  ) {
    // General payment processing logic
    return {
      status: 'requires_confirmation',
      paymentType: 'general',
    };
  }
}
