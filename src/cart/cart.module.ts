import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CartItemService } from './cart-item.service';
import { CartCalculatorService } from './cart-calculator.service';

@Module({
  controllers: [CartController],
  providers: [
    CartService,
    CartItemService,
    CartCalculatorService,
    PrismaService,
  ],
  exports: [CartService, CartItemService, CartCalculatorService],
})
export class CartModule {}
