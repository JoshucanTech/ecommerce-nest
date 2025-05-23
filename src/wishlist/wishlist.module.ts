import { Module } from "@nestjs/common";
import { WishlistService } from "./wishlist.service";
import { WishlistController } from "./wishlist.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProductsModule } from "src/products/products.module";

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
