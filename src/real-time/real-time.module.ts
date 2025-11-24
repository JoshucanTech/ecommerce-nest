import { Module } from '@nestjs/common';
import { RealTimeService } from './real-time.service';
import { RealTimeGateway } from './real-time.gateway';
import { RealTimeController } from './real-time.controller';

@Module({
  providers: [RealTimeGateway, RealTimeService],
  controllers: [RealTimeController],
  exports: [RealTimeService],
})
export class RealTimeModule {}