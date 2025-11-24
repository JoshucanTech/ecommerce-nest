import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

import { VendorsModule } from 'src/vendors/vendors.module';
import { ProductCleanupService } from './product-cleanup.service';
import { RedisModule } from 'src/redis/redis.module';
import { ShippingCalculationService } from 'src/shipping/shipping-calculation.service';
import { ShippingModule } from 'src/shipping/shipping.module';

@Module({
  imports: [PrismaModule, VendorsModule, ShippingModule, RedisModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductCleanupService],
  exports: [ProductsService],
})
export class ProductsModule {}