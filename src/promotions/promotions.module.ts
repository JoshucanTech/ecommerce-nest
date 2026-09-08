import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { CouponsGateway } from './coupons.gateway';
import { RbacModule } from '../common/rbac';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    RbacModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION') || '24h',
        },
      }),
    }),
  ],
  controllers: [PromotionsController, CouponsController],
  providers: [PromotionsService, PrismaService, CouponsService, CouponsGateway],
  exports: [CouponsService, CouponsGateway],
})
export class PromotionsModule { }

