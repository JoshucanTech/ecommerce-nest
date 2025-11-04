import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController, TestController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
//
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ValidationPipe } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { VendorsModule } from './vendors/vendors.module';
import { RidersModule } from './riders/riders.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CommentsModule } from './comments/comments.module';
import { FlashSalesModule } from './flash-sales/flash-sales.module';
import { CategoriesModule } from './categories/categories.module';
import { AdvertisementsModule } from './advertisements/advertisements.module';
import { ShippingModule } from './shipping/shipping.module';
import { RealTimeModule } from './real-time/real-time.module';
import { PromotionsModule } from './promotions/promotions.module';
import { LocationsModule } from './locations/locations.module';
import { HealthModule } from './health/health.module';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { ValidationExceptionFilter } from './exceptions/validation-exception.filter';
//
//

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    VendorsModule,
    RidersModule,
    OrdersModule,
    DeliveriesModule,
    PaymentsModule,
    NotificationsModule,
    CartModule,
    WishlistModule,
    ReviewsModule,
    CommentsModule,
    FlashSalesModule,
    AdvertisementsModule,
    ShippingModule,
    RealTimeModule,
    PromotionsModule,
    LocationsModule,
    HealthModule,
  ],
  controllers: [AppController, TestController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
