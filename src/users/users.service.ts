import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AddressType } from './enums/address-type.enum';
import { Prisma, UserRole, UserStatus, PermissionResource, PermissionAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';


@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findAll(userId: string, params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    const { page, limit, search, role, status } = params;
    const skip = (page - 1) * limit;

    // Fetch actor with positions and permissions
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        positions: {
          include: {
            positionPermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        subAdminProfile: true,
      },
    });

    if (!actor) throw new NotFoundException('User not found');

    // Build where conditions
    const where: any = {};

    // Apply RBAC filtering for SUB_ADMIN
    if (actor.role === UserRole.SUB_ADMIN) {
      const permissions = actor.positions.flatMap(p => p.positionPermissions.map(pp => pp.permission));
      const userPermissions = permissions.filter(p =>
        p.resource === PermissionResource.USERS &&
        (p.action === PermissionAction.VIEW || p.action === PermissionAction.MANAGE)
      );

      if (userPermissions.length === 0) {
        throw new ForbiddenException('No permission to access users');
      }

      // Check if permissions have scope restrictions
      const hasGlobal = userPermissions.some(p => !p.scope);
      if (!hasGlobal && actor.subAdminProfile) {
        const { allowedCities, allowedStates } = actor.subAdminProfile;

        if (allowedCities.length > 0 || allowedStates.length > 0) {
          const scopeConditions = [];

          if (allowedStates.length > 0) {
            scopeConditions.push({ assignedState: { in: allowedStates, mode: 'insensitive' } });
          }
          if (allowedCities.length > 0) {
            scopeConditions.push({ assignedCity: { in: allowedCities, mode: 'insensitive' } });
          }

          if (scopeConditions.length > 0) {
            where.OR = scopeConditions;
          } else {
            // No scope defined, return empty result
            return {
              data: [],
              meta: { total: 0, page, limit, totalPages: 0 },
            };
          }
        }
      }
    } else if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add search filter
    if (search) {
      const searchConditions = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        // Combine scope OR with search OR using AND
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Add role filter
    if (role) {
      where.role = role.toUpperCase().replace('-', '_') as UserRole;
    }

    // Add status filter
    if (status) {
      where.status = status.toUpperCase() as UserStatus;
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
          status: true,
          assignedCity: true,
          assignedState: true,
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

  async findDashboardCustomers(userId: string, params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        vendor: true,
        positions: {
          include: {
            positionPermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!actor) throw new NotFoundException('User not found');

    const orderWhere: any = {};

    if (actor.role === UserRole.VENDOR) {
      orderWhere.vendorId = actor.vendor?.id;
    } else if (actor.role === UserRole.SUB_ADMIN) {
      const permissions = actor.positions.flatMap(p => p.positionPermissions.map(pp => pp.permission));
      const customerPermissions = permissions.filter(p =>
        (p.resource === PermissionResource.USERS || p.resource === PermissionResource.ORDERS) &&
        (p.action === PermissionAction.VIEW || p.action === PermissionAction.MANAGE)
      );

      if (customerPermissions.length === 0) {
        throw new ForbiddenException('No permission to access customers');
      }

      const hasGlobal = customerPermissions.some(p => !p.scope);
      if (!hasGlobal) {
        const states = [];
        const cities = [];
        const vendorIds = [];

        for (const p of customerPermissions) {
          const scope: any = p.scope;
          if (scope?.location?.states) states.push(...scope.location.states);
          if (scope?.location?.cities) cities.push(...scope.location.cities);
          if (scope?.vendors) vendorIds.push(...scope.vendors);
        }

        const conditions = [];
        if (states.length > 0 || cities.length > 0) {
          conditions.push({
            shippingAddress: {
              OR: [
                { state: { in: states, mode: 'insensitive' } },
                { city: { in: cities, mode: 'insensitive' } }
              ]
            }
          });
        }
        if (vendorIds.length > 0) {
          conditions.push({ vendorId: { in: vendorIds } });
        }

        if (conditions.length > 0) {
          orderWhere.OR = conditions;
        } else {
          return { data: [], meta: { total: 0, page: 1, limit: params.limit, totalPages: 0 } };
        }
      }
    } else if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const skip = (params.page - 1) * params.limit;

    const userSearchWhere: any = {};
    if (params.search) {
      userSearchWhere.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Get aggregated stats for users who have orders matching the criteria
    const aggregatedStats = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        ...orderWhere,
        user: userSearchWhere,
      },
      _count: { id: true },
      _sum: { totalAmount: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      skip,
      take: params.limit,
    });

    const totalCustomersResult = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        ...orderWhere,
        user: userSearchWhere,
      },
    });
    const totalCount = totalCustomersResult.length;

    const userIds = aggregatedStats.map(s => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
      }
    });

    const data = aggregatedStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      return {
        id: stat.userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        email: user?.email || '',
        avatar: user?.avatar,
        totalOrders: stat._count.id,
        totalSpent: stat._sum.totalAmount || 0,
        lastOrder: stat._max.createdAt,
      };
    });

    return {
      data,
      meta: {
        total: totalCount,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(totalCount / params.limit),
      }
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        addresses: true,
        vendor: {
          include: {
            businessAddress: true,
          }
        },
        rider: true,
        settings: true,
        shippingAddresses: true,
        positions: {
          include: {
            positionPermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
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

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const { firstName, lastName, phone, email, profile: nestedProfile, ...directProfileData } = updateProfileDto;

    // Merge direct profile data with nested profile data if it exists
    const profileData = {
      ...directProfileData,
      ...(nestedProfile?.bio && { bio: nestedProfile.bio }),
      ...(nestedProfile?.gender && { gender: nestedProfile.gender }),
      ...(nestedProfile?.birthDate && { birthDate: nestedProfile.birthDate }),
    };

    // Update User basic info if any user field is provided
    if (firstName !== undefined || lastName !== undefined || phone !== undefined || email !== undefined) {
      if (email !== undefined) {
        // Check if another user already has this email
        const existingUserWithEmail = await this.prisma.user.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' },
            NOT: { id: userId }
          }
        });

        if (existingUserWithEmail) {
          throw new BadRequestException('Email already in use');
        }
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
        },
      });
    }



    // Check if profile exists
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (profile) {
      // Update existing profile
      return this.prisma.profile.update({
        where: { userId },
        data: profileData,
      });
    } else {
      // Create new profile
      return this.prisma.profile.create({
        data: {
          ...profileData,
          userId,
        },
      });
    }
  }



  async getSettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: {
          userId,
          language: 'en',
          currency: 'USD',
          darkMode: false,
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          marketingEmails: true,
          newProductEmails: false,
          accountActivityEmails: true,
          chatNotifications: true,
          promotionNotifications: false,
        },
      });
    }

    return settings;
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

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (!user.password) {
      throw new BadRequestException(
        'User does not have a password set (social login?). Cannot change password.',
      );
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect current password');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
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
