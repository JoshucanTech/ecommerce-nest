import { Injectable } from '@nestjs/common';
import { ShippingCalculationService } from '../shipping/shipping-calculation.service';

@Injectable()
export class ProductCalculatorService {
  constructor(private shippingCalculationService: ShippingCalculationService) {}

  calculateProductRatings(reviews: any[]) {
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    // Calculate rating distribution
    const ratingDistribution = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };

    for (const review of reviews) {
      ratingDistribution[review.rating]++;
    }

    return {
      avgRating,
      reviewCount: reviews.length,
      ratingDistribution,
    };
  }

  calculateFlashSalePrice(product: any) {
    // Check if product is in an active flash sale
    // Ensure flashSaleItems array exists before calling find
    const flashSaleItems = product.flashSaleItems || [];
    const activeFlashSale = flashSaleItems.find(
      (item) => item.flashSale !== null,
    );

    const flashSalePrice = activeFlashSale
      ? product.price * (1 - activeFlashSale.discountPercentage / 100)
      : null;

    return {
      flashSalePrice,
      activeFlashSale: activeFlashSale
        ? {
            id: activeFlashSale.flashSaleId,
            name: activeFlashSale.flashSale.name,
            discountPercentage: activeFlashSale.discountPercentage,
            endDate: activeFlashSale.flashSale.endDate,
          }
        : null,
    };
  }

  generateShortDescription(description: string) {
    return description.length > 150
      ? description.substring(0, 147) + '...'
      : description;
  }

  calculateShippingInfo(vendor: any) {
    let shippingInfo = null;
    if (vendor.Shipping && vendor.Shipping.length > 0) {
      // Get the fastest/cheapest shipping option
      const fastestShipping = vendor.Shipping.filter((s) => s.isActive).sort(
        (a, b) => a.price - b.price,
      )[0];

      if (fastestShipping) {
        // Get processing time from vendor's shipping policy
        let processingTime = '1-2 business days'; // Default processing time
        if (vendor.ShippingPolicy && vendor.ShippingPolicy.length > 0) {
          processingTime = vendor.ShippingPolicy[0].processingTime;
        }

        const deliveryDateInfo =
          this.shippingCalculationService.calculateDeliveryDate(
            fastestShipping,
            undefined, // No ZIP code yet
            processingTime,
          );

        // Check if shipping method is Prime eligible (based on name or price)
        const isPrimeEligible =
          fastestShipping.price === 0 ||
          (fastestShipping.name &&
            fastestShipping.name.toLowerCase().includes('prime')) ||
          (fastestShipping.name &&
            fastestShipping.name.toLowerCase().includes('free'));

        shippingInfo = {
          method: fastestShipping,
          deliveryDateInfo,
          isFree: fastestShipping.price === 0,
          isPrimeEligible: isPrimeEligible,
        };
      }
    }

    return shippingInfo;
  }
}
