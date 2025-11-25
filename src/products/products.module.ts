import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShippingCalculationService } from '../shipping/shipping-calculation.service';
import { ProductValidationService } from './product-validation.service';
import { ProductCalculatorService } from './product-calculator.service';
import { ProductRecommendationService } from './product-recommendation.service';
import { ProductViewTrackerService } from './product-view-tracker.service';
import { ShippingModule } from '../shipping/shipping.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [ShippingModule, RedisModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    PrismaService,
    ShippingCalculationService,
    ProductValidationService,
    ProductCalculatorService,
    ProductRecommendationService,
    ProductViewTrackerService,
  ],
  exports: [
    ProductsService,
    ProductValidationService,
    ProductCalculatorService,
    ProductRecommendationService,
    ProductViewTrackerService,
  ],
})
export class ProductsModule {}