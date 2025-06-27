import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductCleanupService {
  constructor(private prisma: PrismaService) {}

  // Run every day at midnight
  @Cron('0 0 * * *')
  async cleanOldEntries() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 30); // 30-day TTL

    const result = await this.prisma.recentlyViewedProduct.deleteMany({
      where: {
        viewedAt: {
          lt: threshold,
        },
      },
    });

    console.log(
      `[Cleanup] Deleted ${result.count} expired recently viewed entries`,
    );
  }
}
