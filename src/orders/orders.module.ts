import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  controllers: [OrdersController],
  imports: [RedisModule],
  providers: [
    OrdersService, 
    PrismaService, 
    PaymentsService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}