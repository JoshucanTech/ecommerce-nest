import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseHealthService } from './database-health.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { Interval } from '@nestjs/schedule';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly databaseHealthService: DatabaseHealthService) {}

  @Get('database')
  async checkDatabaseHealth() {
    return await this.databaseHealthService.checkDatabaseHealth();
  }

  @Get('database/latest')
  getLatestDatabaseHealth() {
    return this.databaseHealthService.getLatestHealthCheck();
  }

  @Get('database/cron')
  @Interval(240000) // 240 seconds
  @Public()
  async triggerDatabaseHealthCheck() {
    return await this.databaseHealthService.checkDatabaseHealthCron();
  }
}
