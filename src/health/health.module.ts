import { Module } from '@nestjs/common';
import { DatabaseHealthService } from './database-health.service';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RealTimeModule } from '../real-time/real-time.module';

@Module({
  imports: [PrismaModule, RealTimeModule],
  controllers: [HealthController],
  providers: [DatabaseHealthService],
  exports: [DatabaseHealthService],
})
export class HealthModule {}