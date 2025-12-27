import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductRecommendationService {
  constructor(private prisma: PrismaService) {}

  async getFrequentlyBoughtTogether(productId: string, limit = 5) {
    // Find orders containing the given product
    const ordersWithProduct = await this.prisma.order.findMany({
      where: {
        items: {
          some: {
            productId: productId,
          },
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (ordersWithProduct.length === 0) {
      return [];
    }

    // Aggregate all other products from these orders
    const productFrequency = new Map<string, { product: any; count: number }>();

    for (const order of ordersWithProduct) {
      for (const item of order.items) {
        if (item.productId !== productId) {
          if (productFrequency.has(item.productId)) {
            productFrequency.get(item.productId).count++;
          } else {
            productFrequency.set(item.productId, {
              product: item.product,
              count: 1,
            });
          }
        }
      }
    }

    // Sort by frequency and take the top 'limit'
    const sortedProducts = Array.from(productFrequency.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item) => item.product);

    return sortedProducts;
  }

  async getNewProducts(limit = 10, page = 1) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 14);

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isPublished: true,
          createdAt: {
            gte: daysAgo,
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      }),
      this.prisma.product.count({
        where: {
          isPublished: true,
          createdAt: {
            gte: daysAgo,
          },
        },
      }),
    ]);

    const productsWithRating = products.map((product) => {
      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
            product.reviews.length
          : 0;

      const { reviews, ...rest } = product;

      return {
        ...rest,
        avgRating,
        reviewCount: product.reviews.length,
      };
    });

    return {
      data: productsWithRating,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
