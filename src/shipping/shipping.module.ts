import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShippingCalculationService } from './shipping-calculation.service';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, PrismaService, ShippingCalculationService],
  exports: [ShippingService, ShippingCalculationService],
})
export class ShippingModule {}