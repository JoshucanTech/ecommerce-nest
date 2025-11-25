import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async resolveAddress(createOrderDto: any, userId: string) {
    let address;

    if (createOrderDto.useUserAddress) {
      // Get user's default address
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { addresses: { where: { isDefault: true } } },
      });

      if (!user || !user.addresses || user.addresses.length === 0) {
        throw new NotFoundException('User does not have a default address');
      }

      address = user.addresses[0];
    } else if (createOrderDto.shippingAddressId) {
      // Get a saved shipping address
      const savedAddress = await this.prisma.shippingAddress.findFirst({
        where: {
          id: createOrderDto.shippingAddressId,
          OR: [
            { userId },
            { sharedWith: { some: { sharedWithId: userId } } },
          ],
        },
      });

      if (!savedAddress) {
        throw new NotFoundException(
          `Saved shipping address with ID ${createOrderDto.shippingAddressId} not found`,
        );
      }

      address = savedAddress;
    } else if (createOrderDto.addressId) {
      address = await this.prisma.address.findFirst({
        where: {
          id: createOrderDto.addressId,
          userId,
        },
      });

      if (!address) {
        throw new NotFoundException(
          `Address with ID ${createOrderDto.addressId} not found`,
        );
      }
    } else if (createOrderDto.shippingAddress) {
      // Create a temporary address object from shippingAddress
      address = {
        id: null, // This is a temporary address not stored in DB
        ...createOrderDto.shippingAddress,
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else {
      throw new BadRequestException(
        'Either useUserAddress, shippingAddressId, addressId, or shippingAddress must be provided',
      );
    }

    return address;
  }
}