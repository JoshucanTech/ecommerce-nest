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
    const redisPassword = process.env.REDIS_PASSWORD || undefined;
    const redisUrl = process.env.REDIS_URL || undefined;
    
    this.logger.log(`Initializing Redis connection with: ${redisUrl ? 'REDIS_URL' : `host=${redisHost}, port=${redisPort}${redisPassword ? ', password=***' : ''}`}`);

    const redisOptions = {
      retryStrategy: (times) => {
        this.logger.warn(`Redis connection attempt ${times} failed`);
        // Exponential backoff, max 30 seconds
        const delay = Math.min(times * 1000, 30000);
        this.logger.log(`Retrying Redis connection in ${delay}ms`);
        return delay;
      },
      connectTimeout: 15000,
      maxRetriesPerRequest: 5,
      lazyConnect: true,
      keepAlive: 10000,
      reconnectOnError: (err) => {
        this.logger.error('Redis reconnectOnError:', err.message);
        return true;
      },
    };

    if (redisUrl) {
      this.client = new Redis(redisUrl, redisOptions);
    } else {
      this.client = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        ...redisOptions,
      });
    }

    this.client.on('connect', () => {
      this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client is ready');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis error:', err.message);
      if (err.message.includes('AUTH')) {
        this.logger.error('Redis authentication failed. Check your REDIS_PASSWORD.');
      }
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
    
    this.client.on('end', () => {
      this.logger.log('Redis connection ended');
      this.isConnected = false;
    });
    
    // Connect asynchronously without blocking
    this.connectAsync();
  }

  private async connectAsync() {
    try {
      // Don't block the application startup
      setTimeout(async () => {
        try {
          await this.client.connect();
          this.logger.log('Redis connection established');
        } catch (error) {
          this.logger.error('Failed to establish Redis connection:', error.message);
        }
      }, 0);
    } catch (error) {
      this.logger.error('Error initiating Redis connection:', error.message);
    }
  }

  /**
   * Check if Redis is currently connected
   */
  isRedisConnected(): boolean {
    // Check both our flag and the actual client status
    return this.isConnected && this.client && this.client.status === 'ready';
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
      connected: this.isRedisConnected(),
    };
  }

  private checkConnection(): boolean {
    if (!this.isRedisConnected()) {
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