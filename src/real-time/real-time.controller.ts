import { Controller, Get } from '@nestjs/common';
import { RealTimeService } from './real-time.service';

@Controller('real-time')
export class RealTimeController {
  constructor(private readonly realTimeService: RealTimeService) {}

  @Get()
  getHello(): string {
    return this.realTimeService.getHello();
  }

  @Get('redis-health')
  async getRedisHealth() {
    return await this.realTimeService.getRedisStatus();
  }
}
