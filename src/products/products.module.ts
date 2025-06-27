import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

import { VendorsModule } from 'src/vendors/vendors.module';
import { ProductCleanupService } from './product-cleanup.service';

@Module({
  imports: [PrismaModule, VendorsModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductCleanupService],
  exports: [ProductsService],
})
export class ProductsModule {}
