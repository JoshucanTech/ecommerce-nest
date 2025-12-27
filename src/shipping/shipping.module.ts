import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShippingCalculationService } from './shipping-calculation.service';
import { ShippingCostService } from './shipping-cost.service';

@Module({
  controllers: [ShippingController],
  providers: [
    ShippingService,
    PrismaService,
    ShippingCalculationService,
    ShippingCostService,
  ],
  exports: [ShippingService, ShippingCostService],
})
export class ShippingModule {}
