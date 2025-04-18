import { Module } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { CartModule } from "src/cart/cart.module";
import { CommentsModule } from "src/comments/comments.module";
import { FlashSalesModule } from "src/flash-sales/flash-sales.module";
import { OrdersModule } from "src/orders/orders.module";
import { ReviewsModule } from "src/reviews/reviews.module";
import { WishlistModule } from "src/wishlist/wishlist.module";  
import { VendorsModule } from "src/vendors/vendors.module";

@Module({
  imports: [PrismaModule, VendorsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
