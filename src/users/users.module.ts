// backend/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AddressService } from './address.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, AddressService],
  exports: [AddressService],
})
export class UsersModule {}
