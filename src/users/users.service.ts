import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { AddressType } from './enums/address-type.enum';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
  }) {
    const { page, limit, search, role } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          vendor: {
            select: {
              id: true,
              businessName: true,
              isVerified: true,
            },
          },
          rider: {
            select: {
              id: true,
              isVerified: true,
              isAvailable: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        addresses: true,
        vendor: true,
        rider: true,
        settings: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if email is being updated and is unique
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    // Check if profile exists
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (profile) {
      // Update existing profile
      return this.prisma.profile.update({
        where: { userId },
        data: updateProfileDto,
      });
    } else {
      // Create new profile
      return this.prisma.profile.create({
        data: {
          ...updateProfileDto,
          userId,
        },
      });
    }
  }

  async updateSettings(userId: string, updateSettingsDto: UpdateSettingsDto) {
    // Check if settings exist
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (settings) {
      // Update existing settings
      return this.prisma.userSettings.update({
        where: { userId },
        data: updateSettingsDto,
      });
    } else {
      // Create new settings
      return this.prisma.userSettings.create({
        data: {
          ...updateSettingsDto,
          userId,
        },
      });
    }
  }

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, createAddressDto: CreateAddressDto) {
    const { isDefault, ...addressData } = createAddressDto;

    // If this is the default address, unset any existing default
    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create address
    return this.prisma.address.create({
      data: {
        ...addressData,
        isDefault: isDefault || false,
        user: { connect: { id: userId } },
      },
    });
  }

  async updateAddress(
    userId: string,
    id: string,
    updateAddressDto: UpdateAddressDto,
  ) {
    // Check if address exists and belongs to user
    const address = await this.prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    const { isDefault, ...addressData } = updateAddressDto;

    // If this is being set as the default address, unset any existing default
    if (isDefault && !address.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Update address
    return this.prisma.address.update({
      where: { id },
      data: {
        ...addressData,
        isDefault: isDefault !== undefined ? isDefault : address.isDefault,
      },
    });
  }

  async removeAddress(userId: string, id: string) {
    // Check if address exists and belongs to user
    const address = await this.prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    // Delete address
    await this.prisma.address.delete({
      where: { id },
    });

    return { message: 'Address deleted successfully' };
  }

  async createShippingAddress(
    userId: string,
    createShippingAddressDto: CreateShippingAddressDto,
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // If this is the default address, unset any existing default
    if (createShippingAddressDto.isDefault) {
      await this.prisma.shippingAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If address type is not provided, set to OTHER
    const addressType =
      createShippingAddressDto.addressType || AddressType.OTHER;

    // Create the shipping address
    return this.prisma.shippingAddress.create({
      data: {
        ...createShippingAddressDto,
        addressType,
        user: { connect: { id: userId } },
        // If sharedWithId is provided, create a shared address relationship
        sharedWith: createShippingAddressDto.sharedWithId
          ? {
              create: [
                {
                  sharedBy: { connect: { id: userId } },
                  sharedWith: {
                    connect: { id: createShippingAddressDto.sharedWithId },
                  },
                  canEdit: createShippingAddressDto.canEdit || false,
                  expiresAt: createShippingAddressDto.expiresAt,
                },
              ],
            }
          : undefined,
      },
    });
  }

  async getShippingAddresses(
    userId: string,
    type?: AddressType,
    shared?: boolean,
  ) {
    // Build where conditions based on parameters
    const where: any = { userId };

    if (type) {
      where.addressType = type;
    }

    if (shared !== undefined) {
      where.sharedWith = {
        some: { sharedWithId: userId },
      };
    }

    return this.prisma.shippingAddress.findMany({
      where,
      include: {
        sharedWith: true,
        orders: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getShippingAddress(userId: string, addressId: string) {
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id: addressId,
        OR: [{ userId }, { sharedWith: { some: { sharedWithId: userId } } }],
      },
      include: {
        sharedWith: {
          include: {
            sharedWith: true,
          },
        },
        sharedFrom: true,
        sharedCopies: true,
        orders: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
    });

    if (!address) {
      throw new NotFoundException(
        `Shipping address with ID ${addressId} not found`,
      );
    }

    // Update lastUsed and useCount
    await this.prisma.shippingAddress.update({
      where: { id: addressId },
      data: {
        lastUsed: new Date(),
        useCount: address.useCount + 1,
      },
    });

    return address;
  }

  async updateShippingAddress(
    userId: string,
    addressId: string,
    updateShippingAddressDto: UpdateShippingAddressDto,
  ) {
    // Check if address exists and belongs to user
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException(
        `Shipping address with ID ${addressId} not found`,
      );
    }

    // If updating isDefault to true, unset any existing default
    if (updateShippingAddressDto.isDefault && !address.isDefault) {
      await this.prisma.shippingAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If updating addressType to undefined, set to OTHER
    const addressType =
      updateShippingAddressDto.addressType || address.addressType;

    // Update the shipping address
    return this.prisma.shippingAddress.update({
      where: { id: addressId },
      data: {
        ...updateShippingAddressDto,
        addressType,
      },
    });
  }

  async deleteShippingAddress(userId: string, addressId: string) {
    // Check if address exists and belongs to user
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException(
        `Shipping address with ID ${addressId} not found`,
      );
    }

    // Delete the shipping address
    return this.prisma.shippingAddress.delete({
      where: { id: addressId },
    });
  }

  async shareShippingAddress(
    userId: string,
    addressId: string,
    sharedWithId: string,
    canEdit: boolean,
    expiresAt: Date,
  ) {
    // Check if address exists and belongs to user
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException(
        `Shipping address with ID ${addressId} not found`,
      );
    }

    // Check if sharedWith user exists
    const sharedWithUser = await this.prisma.user.findUnique({
      where: { id: sharedWithId },
    });

    if (!sharedWithUser) {
      throw new NotFoundException(`User with ID ${sharedWithId} not found`);
    }

    // Create a shared address relationship
    return this.prisma.sharedAddress.create({
      data: {
        sharedBy: { connect: { id: userId } },
        sharedWith: { connect: { id: sharedWithId } },
        address: { connect: { id: addressId } },
        canEdit,
        expiresAt,
      },
    });
  }

  async getShippingAddressUsage(userId: string, addressId: string) {
    // Check if address exists and belongs to user or is shared with user
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id: addressId,
        OR: [{ userId }, { sharedWith: { some: { sharedWithId: userId } } }],
      },
    });

    if (!address) {
      throw new NotFoundException(
        `Shipping address with ID ${addressId} not found`,
      );
    }

    // Get address usage history
    return this.prisma.order.findMany({
      where: {
        shippingAddressId: addressId,
      },
      select: {
        id: true,
        createdAt: true,
        total: true,
        status: true,
      },
    });
  }
}
