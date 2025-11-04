import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseHealthService } from './database-health.service';

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
  async triggerDatabaseHealthCheck() {
    return await this.databaseHealthService.checkDatabaseHealth();
  }
}