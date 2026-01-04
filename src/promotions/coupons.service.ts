import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) { }

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

  async findAll(user: any, params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    await this.hydrateUser(user); // Ensure vendor/roles are present

    const where: Prisma.CouponWhereInput = {};

    // RBAC Logic
    if (user.role === UserRole.VENDOR) {
      where.vendorId = user.vendor.id;
    } else if (user.role === UserRole.SUB_ADMIN) {
      if (!user.roles) {
        // Should have been populated by guard/decorator, effectively no permissions if missing
        throw new ForbiddenException('No permissions found');
      }
      const permissions = user.roles.flatMap(r => r.permissions.map(rp => rp.permission));
      // Look for permissions related to PROMOTIONS or COUPONS resource
      const couponPermissions = permissions.filter(p =>
        (p.resource === 'PROMOTIONS' || p.resource === 'COUPONS') &&
        (p.action === 'READ' || p.action === 'MANAGE')
      );

      if (couponPermissions.length === 0) {
        throw new ForbiddenException('No permission to access coupons');
      }

      const hasGlobal = couponPermissions.some(p => !p.scope);
      if (!hasGlobal) {
        const vendorIds = [];
        for (const p of couponPermissions) {
          const scope: any = p.scope;
          if (scope?.vendors) vendorIds.push(...scope.vendors);
        }

        if (vendorIds.length > 0) {
          where.vendorId = { in: vendorIds };
        } else {
          // If scoped restriction exists but no specific vendors listed, deny access
          return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
      }
    }
    // ADMIN sees all

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      const now = new Date();
      if (status === 'active') {
        where.isActive = true;
        where.startDate = { lte: now };
        where.endDate = { gte: now };
      } else if (status === 'expired') {
        where.endDate = { lt: now };
      } else if (status === 'scheduled') {
        where.startDate = { gt: now };
      } else if (status === 'inactive') {
        where.isActive = false;
      }
    }

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: coupons,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: any) {
    await this.hydrateUser(user);
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');

    if (user.role === UserRole.VENDOR && coupon.vendorId !== user.vendor?.id) {
      throw new ForbiddenException('Access denied');
    }
    // Sub-admin permission checks... simplifying for now: if they have READ permission they can see it
    // ideally check scope against coupon.vendorId
    if (user.role === UserRole.SUB_ADMIN) {
      // ... reuse scope check logic or trust findAll filter usually. 
      // For direct IDs, strict check:
      const permissions = user.roles.flatMap(r => r.permissions.map(rp => rp.permission));
      const canManage = permissions.some(p =>
        (p.resource === 'PROMOTIONS' || p.resource === 'COUPONS') && p.action === 'MANAGE'
      );
      const canRead = permissions.some(p =>
        (p.resource === 'PROMOTIONS' || p.resource === 'COUPONS') && p.action === 'READ'
      );

      if (!canManage && !canRead) throw new ForbiddenException('Access denied');

      // Scope check
      const hasGlobal = permissions.some(p => !p.scope && ((p.resource === 'PROMOTIONS' || p.resource === 'COUPONS')));
      if (!hasGlobal) {
        const allowedVendorIds = permissions.flatMap(p => (p.scope as any)?.vendors || []);
        if (coupon.vendorId && !allowedVendorIds.includes(coupon.vendorId)) {
          throw new ForbiddenException('Access denied to this vendor coupon');
        }
        if (!coupon.vendorId && allowedVendorIds.length > 0) {
          // Global coupon, but user is scoped. Deny? 
          throw new ForbiddenException('Access denied to global coupon');
        }
      }
    }

    return coupon;
  }

  async create(user: any, data: CreateCouponDto) {
    await this.hydrateUser(user);
    if (user.role === UserRole.VENDOR) {
      data.vendorId = user.vendor.id;
    }
    // Validate uniqueness
    const existing = await this.prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException('Coupon code already exists');

    return this.prisma.coupon.create({
      data: {
        ...data,
        // Ensure dates are Date objects if DTO passes strings
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      }
    });
  }

  async update(id: string, user: any, data: UpdateCouponDto) {
    const coupon = await this.findOne(id, user); // verifies access

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      }
    });
  }

  async remove(id: string, user: any) {
    await this.findOne(id, user); // verifies access checks
    return this.prisma.coupon.delete({ where: { id } });
  }

  private async hydrateUser(user: any) {
    if (user.role === UserRole.VENDOR && !user.vendor) {
      const fullUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { vendor: true },
      });
      if (fullUser?.vendor) {
        user.vendor = fullUser.vendor;
      }
    } else if (user.role === UserRole.SUB_ADMIN && !user.roles) {
      const fullUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          roles: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });
      if (fullUser?.roles) {
        user.roles = fullUser.roles;
      }
    }
  }
}
