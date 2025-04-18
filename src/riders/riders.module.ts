import { Module } from "@nestjs/common";
import { RidersController } from "./riders.controller";
import { RidersService } from "./riders.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { UsersModule } from "src/users/users.module";

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [RidersController],
  providers: [RidersService],
  exports: [RidersService],
})
export class RidersModule {}
