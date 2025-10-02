import { Module } from '@nestjs/common';
import { RealTimeService } from './real-time.service';
import { RealTimeGateway } from './real-time.gateway';
import { RedisService } from './redis.service';
import { RealTimeController } from './real-time.controller';

@Module({
  providers: [RealTimeGateway, RealTimeService, RedisService],
  controllers: [RealTimeController],
  exports: [RealTimeService, RedisService],
})
export class RealTimeModule {}