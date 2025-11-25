import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductViewTrackerService {
  constructor(private prisma: PrismaService) {}

  async recordView({
    productId,
    userId,
    sessionId,
  }: {
    productId: string;
    userId?: string;
    sessionId?: string;
  }) {
    if (!productId) {
      throw new Error('ProductId must be provided');
    }

    if (!userId && !sessionId) {
      throw new ForbiddenException(
        'Either userId or sessionId must be provided',
      );
    }

    // Delete existing view to avoid duplicates
    await this.prisma.recentlyViewedProduct.deleteMany({
      where: {
        productId,
        ...(userId ? { userId } : { sessionId }),
      },
    });

    // Create new view
    await this.prisma.recentlyViewedProduct.create({
      data: {
        productId,
        userId,
        sessionId,
        viewedAt: new Date(),
      },
    });

    // Keep only the latest 10
    const views = await this.prisma.recentlyViewedProduct.findMany({
      where: userId ? { userId } : { sessionId },
      orderBy: { viewedAt: 'desc' },
    });

    if (views.length > 10) {
      const idsToDelete = views.slice(10).map((view) => view.id);
      await this.prisma.recentlyViewedProduct.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    return { success: true };
  }

  async getRecentlyViewed(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId must be provided');
    }

    const views = await this.prisma.recentlyViewedProduct.findMany({
      where: userId ? { userId } : { sessionId },
      orderBy: { viewedAt: 'desc' },
      take: 10,
      include: {
        product: {
          include: {
            category: true,
            vendor: true,
          },
        },
      },
    });

    return views.map((view) => view.product);
  }
}