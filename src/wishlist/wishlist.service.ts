import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const wishlistItems = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            shortDescription: true,
            quantity: true,
            price: true,
            discountPrice: true,
            images: true,
            vendor: {
              select: {
                id: true,
                businessName: true,
                slug: true,
              },
            },
            flashSaleItems: {
              select: {
                discountPercentage: true,
                flashSaleId: true,
                flashSale: {
                  select: {
                    id: true,
                    isActive: true,
                    startDate: true,
                    endDate: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Process items into a compact product summary with active sale pricing.
    const items = wishlistItems.map((item) => {
      const now = new Date();
      const activeFlashSale = item.product.flashSaleItems.find(
        ({ flashSale }) =>
          flashSale?.isActive &&
          flashSale.startDate <= now &&
          flashSale.endDate >= now,
      );
      const price = item.product.discountPrice || item.product.price;
      const flashSalePrice = activeFlashSale
        ? price * (1 - activeFlashSale.discountPercentage / 100)
        : null;

      const { flashSaleItems, images, ...productRest } = item.product;

      return {
        id: item.id,
        product: {
          ...productRest,
          images: images?.slice(0, 1) ?? [],
          flashSalePrice,
          activeFlashSale: activeFlashSale
            ? {
                id: activeFlashSale.flashSaleId,
                discountPercentage: activeFlashSale.discountPercentage,
                endDate: activeFlashSale.flashSale.endDate,
              }
            : null,
        },
        addedAt: item.createdAt,
      };
    });

    return {
      items,
      count: items.length,
    };
  }

  async addToWishlist(userId: string, productId: string) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check if product is already in wishlist
    const existingItem = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingItem) {
      throw new ConflictException('Product is already in wishlist');
    }

    // Add product to wishlist
    const addedProduct = await this.prisma.wishlistItem.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    const productName = addedProduct.product.name;

    return {
      message: `${productName} has been added to wishlist successfully`,
    };
  }

  async removeFromWishlist(userId: string, productId: string) {
    // Check if product is in wishlist
    const wishlistItem = await this.prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException(
        `Product with ID ${productId} not found in wishlist`,
      );
    }

    // Remove product from wishlist
    await this.prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    const productName = wishlistItem.product.name;

    return {
      message: `${productName} has been removed from wishlist successfully`,
    };
  }

  async clearWishlist(userId: string) {
    // Delete all wishlist items for user
    await this.prisma.wishlistItem.deleteMany({
      where: { userId },
    });

    return { message: 'Wishlist cleared successfully' };
  }
}
