// redis.service.ts
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    });
  }

  async addViewer(productId: string, userId: string) {
    await this.client.sadd(`product:${productId}:viewers`, userId);
    await this.client.expire(`product:${productId}:viewers`, 300); // auto-expire in 5 min
  }

  async removeViewer(productId: string, userId: string) {
    await this.client.srem(`product:${productId}:viewers`, userId);
  }

  async getViewerCount(productId: string): Promise<number> {
    return this.client.scard(`product:${productId}:viewers`);
  }
}
