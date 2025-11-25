import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async processCoupons(couponCode: string, itemsByVendor: any) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon) {
      return null;
    }

    // Check if coupon is active
    const now = new Date();
    if (
      !coupon.isActive ||
      (coupon.startDate && coupon.startDate > now) ||
      (coupon.endDate && coupon.endDate < now)
    ) {
      return null;
    }

    // Check if coupon has reached usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return null;
    }

    // Determine which vendors can use this coupon
    const vendorCoupons = {};
    if (coupon.vendorId) {
      // Coupon is vendor-specific
      vendorCoupons[coupon.vendorId] = coupon;
    } else {
      // Coupon is valid for all vendors
      for (const vendorId in itemsByVendor) {
        vendorCoupons[vendorId] = coupon;
      }
    }

    // Calculate vendor order values
    const vendorOrderValues = {};
    let totalOrderValueAcrossVendors = 0;

    for (const vendorId in itemsByVendor) {
      const vendorItems = itemsByVendor[vendorId];
      let vendorTotal = 0;

      for (const { product, quantity, variantId } of vendorItems) {
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

      vendorOrderValues[vendorId] = vendorTotal;
      totalOrderValueAcrossVendors += vendorTotal;
    }

    return {
      coupon,
      vendorCoupons,
      vendorOrderValues,
      totalOrderValueAcrossVendors,
    };
  }

  calculateDiscount(
    coupon: any,
    vendorTotal: number,
    vendorOrderValue: number,
    totalOrderValueAcrossVendors: number,
  ): number {
    let discountAmount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = vendorTotal * (coupon.discountValue / 100);
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      // Fixed amount discount
      discountAmount = coupon.discountValue;
      // For fixed amount coupons used across multiple vendors,
      // we should distribute the discount proportionally
      if (!coupon.vendorId) {
        discountAmount =
          coupon.discountValue *
          (vendorOrderValue / totalOrderValueAcrossVendors);
      }
    }

    // Check minimum purchase requirement
    if (coupon.minPurchase && vendorTotal < coupon.minPurchase) {
      discountAmount = 0;
    }

    return discountAmount;
  }
}