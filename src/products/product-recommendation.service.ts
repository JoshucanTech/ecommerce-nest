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
      select: {
        items: {
          select: { productId: true },
        },
      },
    });

    if (ordersWithProduct.length === 0) {
      return [];
    }

    // Aggregate all other products from these orders
    const productFrequency = new Map<string, number>();

    for (const order of ordersWithProduct) {
      for (const item of order.items) {
        if (item.productId !== productId) {
          productFrequency.set(
            item.productId,
            (productFrequency.get(item.productId) ?? 0) + 1,
          );
        }
      }
    }

    // Sort by frequency and take the top 'limit'
    const recommendedIds = Array.from(productFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([recommendedProductId]) => recommendedProductId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: recommendedIds } },
      select: {
        id: true,
        name: true,
        shortDescription: true,
        price: true,
        discountPrice: true,
        images: true,
      },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    return recommendedIds
      .map((id) => productsById.get(id))
      .filter((product) => product !== undefined)
      .map((product) => ({
        ...product,
        images: product.images?.slice(0, 1) ?? [],
      }));
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
        select: {
          id: true,
          name: true,
          shortDescription: true,
          price: true,
          discountPrice: true,
          images: true,
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

    const productsWithRating = products.map((product) => ({
      ...product,
      images: product.images?.slice(0, 1) ?? [],
    }));

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
