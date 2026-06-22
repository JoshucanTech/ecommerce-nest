import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ShippingCostService {
  constructor(private prisma: PrismaService) {}

  async getShippingCost(
    shippingOptionId: string,
    vendorId: string,
  ): Promise<number> {
    // First try to find in regular shipping methods
    const shippingMethod = await this.prisma.shipping.findFirst({
      where: { id: shippingOptionId, Vendor: { some: { id: vendorId } } },
    });

    if (shippingMethod) {
      return shippingMethod.price;
    }

    // Check vendorShipping model as fallback
    const vendorShippingMethod = await this.prisma.vendorShipping.findFirst({
      where: { shippingId: shippingOptionId, vendorId: vendorId },
    });

    if (vendorShippingMethod && vendorShippingMethod.priceOverride !== null && vendorShippingMethod.priceOverride !== undefined) {
      return vendorShippingMethod.priceOverride;
    }

    // Fallback: Check if it is a global shipping method
    const globalShippingMethod = await this.prisma.shipping.findUnique({
      where: { id: shippingOptionId, isActive: true },
    });

    if (globalShippingMethod) {
      return globalShippingMethod.price;
    }

    // If no shipping method found, return 0
    return 0;
  }
}
