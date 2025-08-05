import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async apply(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      throw new NotFoundException("Invalid coupon code");
    }

    // Check if coupon is active
    const now = new Date();
    if (!coupon.isActive || (coupon.startDate && coupon.startDate > now) || (coupon.endDate && coupon.endDate < now)) {
      throw new BadRequestException("Coupon is not active or has expired");
    }

    // Check if coupon has reached usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException("Coupon usage limit reached");
    }

    return coupon;
  }
}
