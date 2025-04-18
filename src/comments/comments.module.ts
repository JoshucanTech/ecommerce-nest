import { Module } from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProductsModule } from "src/products/products.module";


@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
