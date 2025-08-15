import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrdersService } from 'src/orders/orders.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  async createPaymentIntent(
    createPaymentIntentDto: CreatePaymentIntentDto,
    userId: string,
  ) {
    // In a real application, you would use a payment provider like Stripe.
    // Here, we'll simulate the process.

    const { items, shippingSelections, couponCode } = createPaymentIntentDto;

    // The logic to calculate the total amount should be robust and secure.
    // For this simulation, we can reuse or adapt the logic from the OrdersService
    // to ensure the total is calculated consistently.
    // This is a simplified calculation for the purpose of this example.

    let totalAmount = 0;

    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(
          `Product with ID ${item.productId} not found`,
        );
      }
      totalAmount += product.price * item.quantity;
    }

    for (const vendorId in shippingSelections) {
      const shippingOptionId = shippingSelections[vendorId];
      const shippingMethod = await this.prisma.shipping.findFirst({
        where: { id: shippingOptionId, vendorId },
      });
      if (shippingMethod) {
        totalAmount += shippingMethod.price;
      }
    }

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
      });
      if (coupon) {
        totalAmount -= coupon.discountValue;
      }
    }

    // Simulate creating a payment intent with a unique client secret.
    const clientSecret = `pi_${uuidv4().replace(/-/g, '')}_secret_${uuidv4().replace(/-/g, '')}`;

    return {
      clientSecret,
      totalAmount: Math.round(totalAmount * 100), // Amount in cents
    };
  }
}
