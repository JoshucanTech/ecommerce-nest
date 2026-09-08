import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async apply(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
    }

    const now = new Date();

    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is not active or has expired');
    }
    if (coupon.startDate && coupon.startDate > now) {
      throw new BadRequestException('Coupon is not active or has expired');
    }
    if (coupon.endDate && coupon.endDate < now) {
      throw new BadRequestException('This coupon has expired');
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    return coupon;
  }
}
