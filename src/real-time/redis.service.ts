// redis.service.ts
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;
    
    this.client = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy: (times) => {
        this.logger.error(`Redis connection attempt ${times} failed`);
        // Retry after 2 seconds, with exponential backoff
        return Math.min(times * 50, 2000);
      },
      connectTimeout: 10000,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis error:', err.message);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
  }

  /**
   * Check if Redis is currently connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get Redis connection info
   */
  getRedisInfo(): { host: string; port: number; connected: boolean } {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;
    
    return {
      host: redisHost,
      port: redisPort,
      connected: this.isConnected,
    };
  }

  private checkConnection(): boolean {
    if (!this.isConnected) {
      this.logger.warn('Redis is not connected. Operations will be skipped.');
      return false;
    }
    return true;
  }

  async addViewer(productId: string, userId: string) {
    if (!this.checkConnection()) return;
    
    try {
      await this.client.sadd(`product:${productId}:viewers`, userId);
      await this.client.expire(`product:${productId}:viewers`, 300); // auto-expire in 5 min
    } catch (error) {
      this.logger.error('Error adding viewer to Redis:', error.message);
    }
  }

  async removeViewer(productId: string, userId: string) {
    if (!this.checkConnection()) return;
    
    try {
      await this.client.srem(`product:${productId}:viewers`, userId);
    } catch (error) {
      this.logger.error('Error removing viewer from Redis:', error.message);
    }
  }

  async getViewerCount(productId: string): Promise<number> {
    if (!this.checkConnection()) return 0;
    
    try {
      return await this.client.scard(`product:${productId}:viewers`);
    } catch (error) {
      this.logger.error('Error getting viewer count from Redis:', error.message);
      return 0;
    }
  }
}