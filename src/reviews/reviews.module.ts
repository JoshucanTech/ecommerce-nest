import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from 'src/products/products.module';
import { RbacModule } from '../common/rbac';

@Module({
  imports: [PrismaModule, ProductsModule, RbacModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule { }
