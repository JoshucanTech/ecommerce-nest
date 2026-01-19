import { Module } from '@nestjs/common';
import { FlashSalesService } from './flash-sales.service';
import { FlashSalesController } from './flash-sales.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductsModule } from 'src/products/products.module';
import { RbacModule } from '../common/rbac';
// import { VendorsModule } from "src/vendors/vendors.module";

@Module({
  imports: [PrismaModule, ProductsModule, RbacModule],
  controllers: [FlashSalesController],
  providers: [FlashSalesService],
  exports: [FlashSalesService],
})
export class FlashSalesModule { }
