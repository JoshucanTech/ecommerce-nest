import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../real-time/redis.service';

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);
  private latestHealthCheck: any = null;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // Run every 12 minutes
  @Cron('*/4 * * * *')
  async checkDatabaseHealthCron() {
    this.logger.log('Running scheduled database health check');
    const result = await this.performDatabaseHealthCheck();
    this.latestHealthCheck = result;
    return result;
  }

  // Method that can be called by the route
  async checkDatabaseHealth() {
    const result = await this.performDatabaseHealthCheck();
    this.latestHealthCheck = result;
    return result;
  }

  // Core logic for database health checking
  private async performDatabaseHealthCheck() {
    try {
      // Perform database queries to check connectivity and get counts
      const [
        userCount,
        orderCount,
        productCount,
        recentOrders,
        recentUsers,
        recentPayments,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.order.count(),
        this.prisma.product.count(),
        this.prisma.order.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
        this.prisma.order.count({
          where: {
            paymentStatus: 'COMPLETED',
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

      // Check Redis health
      const redisInfo = this.redisService.getRedisInfo();
      const isRedisConnected = this.redisService.isRedisConnected();

      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: {
          total: {
            users: userCount,
            orders: orderCount,
            products: productCount,
          },
          recentActivity: {
            ordersLast24Hours: recentOrders,
            usersLast24Hours: recentUsers,
            paymentsLast24Hours: recentPayments,
          },
          redis: {
            connected: isRedisConnected,
            host: redisInfo.host,
            port: redisInfo.port,
          },
        },
      };

      this.logger.log(
        `Database health check successful - Users: ${userCount}, Orders: ${orderCount}, Products: ${productCount}, Redis: ${isRedisConnected ? 'Connected' : 'Disconnected'}`,
      );

      return healthStatus;
    } catch (error) {
      const errorStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };

      this.logger.error(
        `Database health check failed: ${error.message}`,
        error.stack,
      );

      return errorStatus;
    }
  }

  getLatestHealthCheck() {
    return this.latestHealthCheck;
  }
}
