import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CreateRealTimeDto } from './dto/create-real-time.dto';
import { UpdateRealTimeDto } from './dto/update-real-time.dto';

@Injectable()
export class RealTimeService {
  constructor(private readonly redisService: RedisService) {}

  create(createRealTimeDto: CreateRealTimeDto) {
    return 'This action adds a new realTime';
  }

  findAll() {
    return `This action returns all realTime`;
  }

  findOne(id: number) {
    return `This action returns a #${id} realTime`;
  }

  update(id: number, updateRealTimeDto: UpdateRealTimeDto) {
    return `This action updates a #${id} realTime`;
  }

  remove(id: number) {
    return `This action removes a #${id} realTime`;
  }

  getHello(): string {
    return 'Real-time service is running';
  }

  async getRedisStatus(): Promise<{ 
    connected: boolean; 
    message: string;
    host: string;
    port: number;
    timestamp: Date;
  }> {
    const redisInfo = this.redisService.getRedisInfo();
    
    return {
      connected: redisInfo.connected,
      message: redisInfo.connected 
        ? 'Successfully connected to Redis' 
        : 'Redis is not connected. Please ensure Redis is running.',
      host: redisInfo.host,
      port: redisInfo.port,
      timestamp: new Date(),
    };
  }
}