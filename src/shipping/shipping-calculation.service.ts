import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShippingService } from './shipping.service';

@Injectable()
export class ShippingCalculationService {
  constructor(
    private prisma: PrismaService,
    private shippingService: ShippingService,
  ) {}

  /**
   * Calculate estimated delivery date based on shipping method and buyer location
   * @param shippingMethod The shipping method selected
   * @param buyerZipCode Buyer's ZIP code (if available)
   * @returns Object with delivery date information
   */
  calculateDeliveryDate(
    shippingMethod: any,
    buyerZipCode?: string,
    processingTime?: string,
  ) {
    // Parse delivery time range (e.g., "1-2 business days", "3-5 business days")
    // Use estimatedDelivery from ShippingMethodDto or deliveryTime from CreateShippingDto
    const deliveryTimeText =
      shippingMethod.estimatedDelivery ||
      shippingMethod.deliveryTime ||
      '3-5 business days';
    const deliveryTimeMatch = deliveryTimeText.match(/(\d+)-?(\d*)\s*(\w+)/);
    let minDays = 3;
    let maxDays = 5;

    if (deliveryTimeMatch) {
      minDays = parseInt(deliveryTimeMatch[1]);
      maxDays = deliveryTimeMatch[2] ? parseInt(deliveryTimeMatch[2]) : minDays;
    }

    // Adjust based on shipping type
    switch (shippingMethod.shippingType) {
      case 'EXPEDITED':
        minDays = Math.max(1, minDays - 2);
        maxDays = Math.max(2, maxDays - 2);
        break;
      case 'TWO_DAY':
        minDays = 2;
        maxDays = 2;
        break;
      case 'ONE_DAY':
        minDays = 1;
        maxDays = 1;
        break;
      case 'SAME_DAY':
        minDays = 0;
        maxDays = 0;
        break;
    }

    // Parse processing time (e.g., "1-2 business days")
    if (processingTime) {
      const processTimeMatch = processingTime.match(/(\d+)-?(\d*)\s*(\w+)/);
      if (processTimeMatch) {
        const processMin = parseInt(processTimeMatch[1]);
        const processMax = processTimeMatch[2]
          ? parseInt(processTimeMatch[2])
          : processMin;
        minDays += processMin;
        maxDays += processMax;
      }
    }

    const today = new Date();

    // Calculate delivery dates
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + minDays);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxDays);

    // Format dates
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };

    const minDateFormatted = minDate.toLocaleDateString('en-US', options);
    const maxDateFormatted = maxDate.toLocaleDateString('en-US', options);

    // If min and max are the same day, show single date
    const deliveryRange =
      minDays === maxDays
        ? minDateFormatted
        : `${minDateFormatted} - ${maxDateFormatted}`;

    // Get day of week for the max date
    const weekdays = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const dayOfWeek = weekdays[maxDate.getDay()];

    return {
      minDate: minDateFormatted,
      maxDate: maxDateFormatted,
      deliveryRange,
      dayOfWeek,
      minDays,
      maxDays,
    };
  }

  /**
   * Get the fastest shipping option for a vendor
   * @param vendorId The vendor ID
   * @returns The fastest shipping option
   */
  async getFastestShippingOption(vendorId: string) {
    const shippingMethods = await this.prisma.vendorShipping.findMany({
      where: {
        vendorId: vendorId,
        isActive: true,
      },
      include: {
        shipping: true,
      },
      orderBy: {
        shipping: {
          shippingType: 'asc', // Order by shipping type priority
        },
      },
    });

    // Return the first one (fastest based on shipping type)
    return shippingMethods.length > 0 ? shippingMethods[0].shipping : null;
  }

  /**
   * Get all available shipping options for a vendor
   * @param vendorId The vendor ID
   * @returns Array of available shipping options
   */
  async getAvailableShippingOptions(vendorId: string) {
    const vendorShippings = await this.prisma.vendorShipping.findMany({
      where: {
        vendorId: vendorId,
        isActive: true,
      },
      include: {
        shipping: {
          include: {
            shippingZones: true,
          },
        },
      },
      orderBy: {
        shipping: {
          price: 'asc',
        },
      },
    });

    // Map to the format expected by the frontend
    return vendorShippings.map((vs) => ({
      ...vs.shipping,
      // Use the vendor's price override if available, otherwise use the default price
      price:
        vs.priceOverride !== null && vs.priceOverride !== undefined
          ? vs.priceOverride
          : vs.shipping.price,
      fulfillment: vs.fulfillment,
    }));
  }

  /**
   * Calculate shipping cost for an order
   * @param vendorId The vendor ID
   * @param shippingMethodId The shipping method ID
   * @param address The delivery address
   * @param orderValue The total order value
   * @param totalWeight The total weight of items
   * @returns The calculated shipping cost
   */
  async calculateShippingCost(
    vendorId: string,
    shippingMethodId: string,
    address: {
      country: string;
      region?: string;
      postalCode?: string;
      city?: string;
    },
    orderValue: number,
    totalWeight: number,
  ): Promise<number> {
    // Verify that this vendor has access to this shipping method
    const vendorShipping = await this.prisma.vendorShipping.findUnique({
      where: {
        vendorId_shippingId: {
          vendorId,
          shippingId: shippingMethodId,
        },
      },
    });

    if (!vendorShipping || !vendorShipping.isActive) {
      throw new Error(
        `Vendor ${vendorId} does not have access to shipping method ${shippingMethodId}`,
      );
    }

    // Calculate the shipping cost using the shipping service
    return this.shippingService.calculateShippingCost(
      shippingMethodId,
      address,
      orderValue,
      totalWeight,
    );
  }

  /**
   * Check if an order qualifies for free shipping
   * @param vendorId The vendor ID
   * @param shippingMethodId The shipping method ID
   * @param orderValue The total order value
   * @returns Boolean indicating if order qualifies for free shipping
   */
  async isFreeShipping(
    vendorId: string,
    shippingMethodId: string,
    orderValue: number,
  ): Promise<boolean> {
    // Get the shipping method with zones
    const shipping = await this.shippingService.findWithZones(shippingMethodId);

    // Check if any zone offers free shipping for this order value
    const freeShippingZone = shipping.shippingZones.find((zone) => {
      return (
        zone.minPrice !== null &&
        zone.minPrice !== undefined &&
        orderValue >= zone.minPrice &&
        zone.price === 0
      );
    });

    return !!freeShippingZone;
  }
}
