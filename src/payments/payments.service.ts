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
      include: {
        variants: true,
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
          const variant = product.variants.find((v) => v.id === variantId);
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
            ).reduce((total, vendorItemList) => {
              return (
                total +
                vendorItemList.reduce((vendorTotal, item) => {
                  let unitPrice;
                  if (item.variantId) {
                    const variant = item.product.variants.find(
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

                  const activeFlashSale = item.product.flashSaleItems.find(
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
                const variant = item.product.variants.find(
                  (v) => v.id === item.variantId,
                );
                unitPrice =
                  variant?.discountPrice ||
                  variant?.price ||
                  item.product.price;
              } else {
                unitPrice = item.product.discountPrice || item.product.price;
              }

              const activeFlashSale = item.product.flashSaleItems.find(
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
          where: { id: shippingOptionId, vendorId },
        });
        if (shippingMethod) {
          vendorTotal += shippingMethod.price;
        }
      }

      vendorTotals[vendorId] = vendorTotal;
      totalAmount += vendorTotal;
    }

    // Simulate creating a payment intent with a unique client secret.
    const clientSecret = `pi_${uuidv4().replace(/-/g, '')}_secret_${uuidv4().replace(/-/g, '')}`;

    return {
      clientSecret,
      totalAmount: Math.round(totalAmount * 100), // Amount in cents
      vendorTotals: Object.keys(vendorTotals).reduce((acc, vendorId) => {
        acc[vendorId] = Math.round(vendorTotals[vendorId] * 100);
        return acc;
      }, {}),
    };
  }
}
