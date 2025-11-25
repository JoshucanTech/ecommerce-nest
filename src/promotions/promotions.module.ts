import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CouponsService } from './coupons.service';

@Module({
  controllers: [PromotionsController],
  providers: [PromotionsService, PrismaService, CouponsService],
  exports: [CouponsService],
})
export class PromotionsModule {}
