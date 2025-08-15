import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShippingDto, ShippingZoneDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';

@Injectable()
export class ShippingService {
  constructor(private prisma: PrismaService) {}

  async create(createShippingDto: CreateShippingDto, vendorId: string) {
    const {
      vendorId: dtoVendorId,
      shippingZones,
      ...shippingData
    } = createShippingDto;

    const shipping = await this.prisma.shipping.create({
      data: {
        ...shippingData,
        vendor: {
          connect: { id: vendorId },
        },

        shippingZones: {
          create:
            shippingZones?.map((zone) => ({
              country: zone.country,
              region: zone.region,
              postalCode: zone.postalCode,
            })) || [],
        }, // Use the transformed shippingZones variable
      },
    });

    return shipping;
  }

  async findAll(vendorId: string) {
    return this.prisma.shipping.findMany({
      where: { vendorId },
    });
  }

  async findOne(id: string, vendorId: string) {
    const shipping = await this.prisma.shipping.findUnique({
      where: { id },
    });

    if (!shipping || shipping.vendorId !== vendorId) {
      throw new NotFoundException(`Shipping method with ID ${id} not found`);
    }

    return shipping;
  }

  // async update(
  //   id: string,
  //   updateShippingDto: UpdateShippingDto,
  //   vendorId: string,
  // ) {
  //   const shipping = await this.findOne(id, vendorId);

  //   return this.prisma.shipping.update({
  //     where: { id },
  //     data: updateShippingDto,
  //   });
  // }

  // ... existing code ...
  async update(
    id: string,
    updateShippingDto: UpdateShippingDto,
    vendorId: string,
  ) {
    const shipping = await this.findOne(id, vendorId);

    const {
      vendorId: dtoVendorId,
      shippingZones,
      ...updateData
    } = updateShippingDto;

    // Handle shipping zones update properly with Prisma nested operations
    let shippingZonesData = undefined;
    if (shippingZones) {
      shippingZonesData = {
        deleteMany: {},
        create: shippingZones.map((zone) => ({
          country: zone.country,
          region: zone.region,
          postalCode: zone.postalCode,
        })),
      };
    }

    return this.prisma.shipping.update({
      where: { id },
      data: {
        ...updateData,
        shippingZones: shippingZonesData,
      },
    });
  }
  // ... existing code ...

  async remove(id: string, vendorId: string) {
    const shipping = await this.findOne(id, vendorId);

    await this.prisma.shipping.delete({
      where: { id },
    });

    return { message: 'Shipping method deleted successfully' };
  }

  async getAvailableMethodsForVendor(vendorId: string) {
    return this.prisma.shipping.findMany({
      where: {
        vendorId: vendorId,
      },
    });
  }
}
