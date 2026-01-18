// backend/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AddressService } from './address.service';
import { RbacModule } from '../common/rbac';

@Module({
  controllers: [UsersController],
  imports: [RbacModule],
  providers: [UsersService, PrismaService, AddressService],
  exports: [AddressService, UsersService],
})
export class UsersModule { }
