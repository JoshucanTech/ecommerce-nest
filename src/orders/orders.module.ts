import { Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProductsModule } from "src/products/products.module";
import { ValidationExceptionFilter } from "../exceptions/validation-exception.filter";


@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    ValidationExceptionFilter,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}