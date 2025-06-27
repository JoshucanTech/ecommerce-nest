import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// 
// 
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";

import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ProductsModule } from "./products/products.module";
import { VendorsModule } from "./vendors/vendors.module";
import { RidersModule } from "./riders/riders.module";
import { OrdersModule } from "./orders/orders.module";
import { DeliveriesModule } from "./deliveries/deliveries.module";
import { PaymentsModule } from "./payments/payments.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { CartModule } from "./cart/cart.module";
import { WishlistModule } from "./wishlist/wishlist.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { CommentsModule } from "./comments/comments.module";
import { FlashSalesModule } from "./flash-sales/flash-sales.module";
import { CategoriesModule } from './categories/categories.module';
import { AdvertisementsModule } from './advertisements/advertisements.module';
import { ShippingModule } from './shipping/shipping.module';
// 
// 

@Module({
  imports: [
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
  ],
  // controllers: [AppController],
  // providers: [AppService],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
