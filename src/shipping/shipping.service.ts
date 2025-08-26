import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShippingDto, ShippingZoneDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { Prisma, Shipping, VendorShipping } from '@prisma/client';

@Injectable()
export class ShippingService {
  constructor(private prisma: PrismaService) {}

  // Create a new shipping method (not tied to any specific vendor)
  async create(createShippingDto: CreateShippingDto) {
    const {
      vendorId: dtoVendorId,
      shippingZones,
      shippingType,
      ...shippingData
    } = createShippingDto;

    const shipping = await this.prisma.shipping.create({
      data: {
        ...shippingData,
        shippingType: shippingType || 'STANDARD',
        shippingZones: {
          create:
            shippingZones?.map((zone) => ({
              country: zone.country,
              region: zone.region,
              postalCode: zone.postalCode,
              city: zone.city,
              price: zone.price,
              minWeight: zone.minWeight,
              maxWeight: zone.maxWeight,
              minPrice: zone.minPrice,
              maxPrice: zone.maxPrice,
            })) || [],
        },
      },
    });

    return shipping;
  }

  // Get all shipping methods
  async findAll() {
    return this.prisma.shipping.findMany({
      where: { isActive: true },
      include: {
        shippingZones: true,
      },
    });
  }

  // Get a specific shipping method
  async findOne(id: string) {
    const shipping = await this.prisma.shipping.findUnique({
      where: { id },
      include: {
        shippingZones: true,
      },
    });

    if (!shipping) {
      throw new NotFoundException(`Shipping method with ID ${id} not found`);
    }

    return shipping;
  }

  // Update a shipping method
  async update(
    id: string,
    updateShippingDto: UpdateShippingDto,
  ): Promise<Shipping> {
    const shipping = await this.findOne(id);

    const {
      vendorId: dtoVendorId,
      shippingZones,
      ...updateData
    } = updateShippingDto;

    // Handle shipping zones update properly with Prisma nested operations
    let shippingZonesData = undefined;
    if (shippingZones !== undefined) {
      shippingZonesData = {
        deleteMany: {},
        create: shippingZones.map((zone) => ({
          country: zone.country,
          region: zone.region,
          postalCode: zone.postalCode,
          city: zone.city,
          price: zone.price,
          minWeight: zone.minWeight,
          maxWeight: zone.maxWeight,
          minPrice: zone.minPrice,
          maxPrice: zone.maxPrice,
        })),
      };
    }

    return this.prisma.shipping.update({
      where: { id },
      data: {
        ...updateData,
        shippingZones: shippingZonesData,
      },
      include: {
        shippingZones: true,
      },
    });
  }

  // Delete a shipping method
  async remove(id: string) {
    const shipping = await this.findOne(id);

    await this.prisma.shipping.delete({
      where: { id },
    });

    return { message: 'Shipping method deleted successfully' };
  }

  // Associate a shipping method with a vendor
  async associateWithVendor(
    shippingId: string,
    vendorId: string,
    priceOverride?: number,
    fulfillmentType: 'MERCHANT' | 'PLATFORM' | 'PRIME' = 'MERCHANT',
  ): Promise<VendorShipping> {
    // Verify both entities exist
    const [shipping, vendor] = await Promise.all([
      this.findOne(shippingId),
      this.prisma.vendor.findUnique({
        where: { id: vendorId },
      }),
    ]);

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    // Create or update the association
    return this.prisma.vendorShipping.upsert({
      where: {
        vendorId_shippingId: {
          vendorId,
          shippingId,
        },
      },
      create: {
        vendorId,
        shippingId,
        priceOverride,
        fulfillment: fulfillmentType,
      },
      update: {
        priceOverride,
        isActive: true,
        fulfillment: fulfillmentType,
      },
    });
  }

  // Get all shipping methods available to a vendor
  async getAvailableShippingMethods(vendorId: string): Promise<Shipping[]> {
    // First verify the vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    // Get all active associations with their shipping methods
    const vendorShippings = await this.prisma.vendorShipping.findMany({
      where: {
        vendorId,
        isActive: true,
      },
      include: {
        shipping: {
          include: {
            shippingZones: true,
          },
        },
      },
    });

    // Return enriched shipping methods with effective prices
    return vendorShippings.map((vs) => ({
      ...vs.shipping,
      // Use the vendor's price override if available, otherwise use the default price
      price:
        vs.priceOverride !== null && vs.priceOverride !== undefined
          ? vs.priceOverride
          : vs.shipping.price,
      minDays:
        vs.minDaysOverride !== null && vs.minDaysOverride !== undefined
          ? vs.minDaysOverride
          : vs.shipping.minDays,
      maxDays:
        vs.maxDaysOverride !== null && vs.maxDaysOverride !== undefined
          ? vs.maxDaysOverride
          : vs.shipping.maxDays,
      vendorId,
    }));
  }

  // Dissociate a shipping method from a vendor
  async dissociateFromVendor(
    shippingId: string,
    vendorId: string,
  ): Promise<VendorShipping> {
    // Check if association exists
    const association = await this.prisma.vendorShipping.findUnique({
      where: {
        vendorId_shippingId: {
          vendorId,
          shippingId,
        },
      },
    });

    if (!association) {
      throw new NotFoundException(
        `No association found between shipping method ${shippingId} and vendor ${vendorId}`,
      );
    }

    // Soft delete the association
    return this.prisma.vendorShipping.update({
      where: {
        vendorId_shippingId: {
          vendorId,
          shippingId,
        },
      },
      data: {
        isActive: false,
      },
    });
  }

  // Get all vendors associated with a shipping method
  async getVendorsForShippingMethod(shippingId: string) {
    // First verify the shipping method exists
    await this.findOne(shippingId);

    // Get all active vendor associations
    const vendorShippings = await this.prisma.vendorShipping.findMany({
      where: {
        shippingId,
        isActive: true,
      },
      include: {
        vendor: true,
      },
    });

    // Return just the vendor objects
    return vendorShippings.map((vs) => vs.vendor);
  }

  // Helper method to find shipping method with its zones
  async findWithZones(id: string) {
    const shipping = await this.prisma.shipping.findUnique({
      where: { id },
      include: {
        shippingZones: true,
      },
    });

    if (!shipping) {
      throw new NotFoundException(`Shipping method with ID ${id} not found`);
    }

    return shipping;
  }

  // Calculate shipping cost based on zone, weight, and order value
  async calculateShippingCost(
    shippingId: string,
    address: {
      country: string;
      region?: string;
      postalCode?: string;
      city?: string;
    },
    orderValue: number,
    totalWeight: number,
  ): Promise<number> {
    const shipping = await this.findWithZones(shippingId);

    // Find the most specific matching zone
    const matchingZone = shipping.shippingZones.find((zone) => {
      // Country must match
      if (zone.country !== address.country) return false;

      // If region is specified in zone, it must match
      if (zone.region && zone.region !== address.region) return false;

      // If city is specified in zone, it must match
      if (zone.city && zone.city !== address.city) return false;

      // If postal code is specified in zone, it must match
      if (zone.postalCode && zone.postalCode !== address.postalCode)
        return false;

      // Check weight constraints
      if (
        zone.minWeight !== null &&
        zone.minWeight !== undefined &&
        totalWeight < zone.minWeight
      )
        return false;
      if (
        zone.maxWeight !== null &&
        zone.maxWeight !== undefined &&
        totalWeight > zone.maxWeight
      )
        return false;

      // Check price constraints
      if (
        zone.minPrice !== null &&
        zone.minPrice !== undefined &&
        orderValue < zone.minPrice
      )
        return false;
      if (
        zone.maxPrice !== null &&
        zone.maxPrice !== undefined &&
        orderValue > zone.maxPrice
      )
        return false;

      return true;
    });

    // If we found a matching zone with a specific price, use it
    if (
      matchingZone &&
      matchingZone.price !== null &&
      matchingZone.price !== undefined
    ) {
      return matchingZone.price;
    }

    // Otherwise, use the base shipping price
    return shipping.price;
  }
}
