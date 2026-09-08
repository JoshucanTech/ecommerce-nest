import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponsGateway } from './coupons.gateway';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    private prisma: PrismaService,
    private couponsGateway: CouponsGateway,
  ) {}

  /**
   * Background task: checks for expired coupons every 10 seconds.
   * Ensures expired coupons automatically transition to expired in real time
   * and broadcasts the event to all frontends on all devices immediately.
   */
  @Interval(10000)
  async handlePeriodicCouponExpiration() {
    try {
      await this.checkAndExpireCoupons();
    } catch (err) {
      this.logger.error(`Error in scheduled coupon expiration: ${err.message}`);
    }
  }

  /**
   * Check database for active coupons whose endDate has passed.
   * Atomically updates them to isActive: false and broadcasts to all connected devices.
   */
  async checkAndExpireCoupons(): Promise<any[]> {
    const now = new Date();

    const expiredCoupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        endDate: { lte: now },
      },
    });

    if (expiredCoupons.length === 0) {
      return [];
    }

    const ids = expiredCoupons.map((c) => c.id);

    // Update database: mark isActive: false for expired coupons
    await this.prisma.coupon.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });

    this.logger.log(
      `Expired ${expiredCoupons.length} coupon(s): ${expiredCoupons.map((c) => c.code).join(', ')}`,
    );

    // Broadcast expiration event to all devices via WebSockets
    for (const coupon of expiredCoupons) {
      this.couponsGateway.broadcastCouponExpired({
        id: coupon.id,
        code: coupon.code,
        vendorId: coupon.vendorId,
        status: 'expired',
        endDate: coupon.endDate,
      });
    }

    return expiredCoupons;
  }

  /**
   * Helper to accurately compute real-time coupon status:
   * 'expired' | 'scheduled' | 'inactive' | 'active'
   */
  computeCouponStatus(coupon: {
    startDate: Date | string;
    endDate: Date | string;
    isActive: boolean;
  }): 'expired' | 'scheduled' | 'inactive' | 'active' {
    const now = new Date();
    const start = new Date(coupon.startDate);
    const end = new Date(coupon.endDate);

    if (now >= end) {
      return 'expired';
    }
    if (!coupon.isActive) {
      return 'inactive';
    }
    if (now < start) {
      return 'scheduled';
    }
    return 'active';
  }

  async processCoupons(couponCode: string, itemsByVendor: any) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon) {
      return null;
    }

    const now = new Date();

    // Check if expired
    if (coupon.endDate && new Date(coupon.endDate) <= now) {
      if (coupon.isActive) {
        // Automatically expire in database
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { isActive: false },
        });
        this.couponsGateway.broadcastCouponExpired({
          id: coupon.id,
          code: coupon.code,
          vendorId: coupon.vendorId,
          status: 'expired',
          endDate: coupon.endDate,
        });
      }
      return null;
    }

    // Check if coupon is active and scheduled
    if (
      !coupon.isActive ||
      (coupon.startDate && new Date(coupon.startDate) > now)
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
      coupon: {
        ...coupon,
        status: this.computeCouponStatus(coupon),
      },
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

  async findAll(
    user: any,
    params: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
    },
  ) {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    await this.hydrateUser(user);

    // Run expiration check on read to ensure fresh state
    await this.checkAndExpireCoupons();

    const where: Prisma.CouponWhereInput = {};

    // RBAC Logic
    if (user.role === UserRole.VENDOR) {
      where.vendorId = user.vendor.id;
    } else if (user.role === UserRole.SUB_ADMIN) {
      if (!user.positions) {
        throw new ForbiddenException('No permissions found');
      }
      const permissions = user.positions.flatMap((p) =>
        p.positionPermissions.map((pp) => pp.permission),
      );
      const couponPermissions = permissions.filter(
        (p) =>
          (p.resource === 'PROMOTIONS' || p.resource === 'COUPONS') &&
          (p.action === 'READ' || p.action === 'MANAGE'),
      );

      if (couponPermissions.length === 0) {
        throw new ForbiddenException('No permission to access coupons');
      }

      const hasGlobal = couponPermissions.some((p) => !p.scope);
      if (!hasGlobal) {
        const vendorIds = [];
        for (const p of couponPermissions) {
          const scope: any = p.scope;
          if (scope?.vendors) vendorIds.push(...scope.vendors);
        }

        if (vendorIds.length > 0) {
          where.vendorId = { in: vendorIds };
        } else {
          return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
      }
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const now = new Date();
    if (status && status !== 'all') {
      if (status === 'active') {
        where.isActive = true;
        where.startDate = { lte: now };
        where.endDate = { gt: now };
      } else if (status === 'expired') {
        where.endDate = { lte: now };
      } else if (status === 'scheduled') {
        where.startDate = { gt: now };
        where.endDate = { gt: now };
      } else if (status === 'inactive') {
        where.isActive = false;
        where.endDate = { gt: now };
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

    const enrichedCoupons = coupons.map((c) => ({
      ...c,
      status: this.computeCouponStatus(c),
    }));

    return {
      data: enrichedCoupons,
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

    if (user.role === UserRole.SUB_ADMIN) {
      const permissions = user.positions.flatMap((p) =>
        p.positionPermissions.map((pp) => pp.permission),
      );
      const canManage = permissions.some(
        (p) =>
          (p.resource === 'PROMOTIONS' || p.resource === 'COUPONS') &&
          p.action === 'MANAGE',
      );
      const canRead = permissions.some(
        (p) =>
          (p.resource === 'PROMOTIONS' || p.resource === 'COUPONS') &&
          p.action === 'READ',
      );

      if (!canManage && !canRead) throw new ForbiddenException('Access denied');

      const hasGlobal = permissions.some(
        (p) =>
          !p.scope && (p.resource === 'PROMOTIONS' || p.resource === 'COUPONS'),
      );
      if (!hasGlobal) {
        const allowedVendorIds = permissions.flatMap(
          (p) => (p.scope as any)?.vendors || [],
        );
        if (coupon.vendorId && !allowedVendorIds.includes(coupon.vendorId)) {
          throw new ForbiddenException('Access denied to this vendor coupon');
        }
        if (!coupon.vendorId && allowedVendorIds.length > 0) {
          throw new ForbiddenException('Access denied to global coupon');
        }
      }
    }

    const now = new Date();
    // Check if expired and update DB if needed
    if (coupon.isActive && new Date(coupon.endDate) <= now) {
      await this.prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      });
      coupon.isActive = false;
      this.couponsGateway.broadcastCouponExpired({
        id: coupon.id,
        code: coupon.code,
        vendorId: coupon.vendorId,
        status: 'expired',
        endDate: coupon.endDate,
      });
    }

    return {
      ...coupon,
      status: this.computeCouponStatus(coupon),
    };
  }

  async create(user: any, data: CreateCouponDto) {
    await this.hydrateUser(user);
    if (user.role === UserRole.VENDOR) {
      data.vendorId = user.vendor.id;
    }
    // Validate uniqueness
    const existing = await this.prisma.coupon.findUnique({
      where: { code: data.code },
    });
    if (existing) throw new BadRequestException('Coupon code already exists');

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    const now = new Date();
    const isActive =
      data.isActive !== undefined ? data.isActive && endDate > now : endDate > now;

    const created = await this.prisma.coupon.create({
      data: {
        ...data,
        startDate,
        endDate,
        isActive,
      },
    });

    const enriched = {
      ...created,
      status: this.computeCouponStatus(created),
    };

    this.couponsGateway.broadcastCouponCreated(enriched);
    return enriched;
  }

  async update(id: string, user: any, data: UpdateCouponDto) {
    const coupon = await this.findOne(id, user);

    const startDate = data.startDate ? new Date(data.startDate) : new Date(coupon.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : new Date(coupon.endDate);

    const now = new Date();

    // Prevent activating an expired coupon without extending end date
    if (data.isActive === true && endDate <= now) {
      throw new BadRequestException(
        'Cannot activate an expired coupon. Please extend the expiration date first.',
      );
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? startDate : undefined,
        endDate: data.endDate ? endDate : undefined,
        isActive: data.isActive !== undefined ? data.isActive : (endDate <= now ? false : undefined),
      },
    });

    const enriched = {
      ...updated,
      status: this.computeCouponStatus(updated),
    };

    if (enriched.status === 'expired') {
      this.couponsGateway.broadcastCouponExpired({
        id: updated.id,
        code: updated.code,
        vendorId: updated.vendorId,
        status: 'expired',
        endDate: updated.endDate,
      });
    } else {
      this.couponsGateway.broadcastCouponUpdated(enriched);
    }

    return enriched;
  }

  async remove(id: string, user: any) {
    const coupon = await this.findOne(id, user);
    await this.prisma.coupon.delete({ where: { id } });

    this.couponsGateway.broadcastCouponDeleted({
      id: coupon.id,
      vendorId: coupon.vendorId,
    });

    return { success: true };
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
    } else if (user.role === UserRole.SUB_ADMIN && !user.positions) {
      const fullUser = await this.prisma.user.findUnique({
        where: { id: user.id },
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
        },
      });
      if (fullUser?.positions) {
        user.positions = fullUser.positions;
      }
    }
  }
}
