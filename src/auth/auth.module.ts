import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: configService.get("JWT_ACCESS_EXPIRATION"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
