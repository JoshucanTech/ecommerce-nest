import { Module } from "@nestjs/common";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProductsModule } from "src/products/products.module";

@Module({
  imports: [PrismaModule, ProductsModule],
  // imports: [PrismaModule], 
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
