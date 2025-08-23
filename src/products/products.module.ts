import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

import { VendorsModule } from 'src/vendors/vendors.module';
import { ProductCleanupService } from './product-cleanup.service';
import { RedisService } from 'src/real-time/redis.service';
import { ShippingCalculationService } from 'src/shipping/shipping-calculation.service';
import { ShippingModule } from 'src/shipping/shipping.module';

@Module({
  imports: [PrismaModule, VendorsModule, ShippingModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductCleanupService, RedisService],
  exports: [ProductsService],
})
export class ProductsModule {}
