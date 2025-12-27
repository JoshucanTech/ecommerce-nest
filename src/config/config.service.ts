import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get(key: string): string {
    return this.configService.get<string>(key);
  }

  getNumber(key: string): number {
    return Number(this.configService.get<string>(key));
  }

  getBoolean(key: string): boolean {
    return this.configService.get<string>(key) === 'true';
  }

  get jwtSecret(): string {
    return this.get('JWT_ACCESS_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.get('JWT_ACCESS_EXPIRATION');
  }

  get jwtRefreshSecret(): string {
    return this.get('JWT_REFRESH_SECRET');
  }

  get jwtRefreshExpiresIn(): string {
    return this.get('JWT_REFRESH_EXPIRATION');
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV') || 'development';
  }

  get port(): number {
    return this.getNumber('PORT') || 3000;
  }

  get frontendUrl(): string {
    return this.get('FRONTEND_URL') || 'http://localhost:3000';
  }

  get mailHost(): string {
    return this.get('MAIL_HOST');
  }

  get mailPort(): number {
    return this.getNumber('MAIL_PORT');
  }

  get mailUser(): string {
    return this.get('MAIL_USER');
  }

  get mailPassword(): string {
    return this.get('MAIL_PASSWORD');
  }

  get mailFrom(): string {
    return this.get('MAIL_FROM');
  }
}
