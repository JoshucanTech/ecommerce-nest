import { Module } from '@nestjs/common';
import { RealTimeService } from './real-time.service';
import { RealTimeGateway } from './real-time.gateway';
import { RedisService } from './redis.service';

@Module({
  providers: [RealTimeGateway, RealTimeService, RedisService],
  controllers: [],
  exports: [RealTimeService, RedisService],
})
export class RealTimeModule {}
