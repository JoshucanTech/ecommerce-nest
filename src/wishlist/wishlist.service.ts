import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import  { PrismaService } from "../prisma/prisma.service";

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
            reviews: {
              select: {
                rating: true,
              },
            },
            flashSaleItems: {
              include: {
                flashSale: {
                  select: {
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
        createdAt: "desc",
      },
    });

    // Process items to include average rating and flash sale info
    const items = wishlistItems.map((item) => {
      const avgRating =
        item.product.reviews.length > 0
          ? item.product.reviews.reduce(
              (sum, review) => sum + review.rating,
              0,
            ) / item.product.reviews.length
          : 0;

      const activeFlashSale = item.product.flashSaleItems.find(
        (fsi) => fsi.flashSale !== null,
      );
      const price = item.product.discountPrice || item.product.price;
      const flashSalePrice = activeFlashSale
        ? price * (1 - activeFlashSale.discountPercentage / 100)
        : null;

      const { reviews, flashSaleItems, ...productRest } = item.product;

      return {
        id: item.id,
        product: {
          ...productRest,
          avgRating,
          reviewCount: item.product.reviews.length,
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
      throw new ConflictException("Product is already in wishlist");
    }

    // Add product to wishlist
    await this.prisma.wishlistItem.create({
      data: {
        userId,
        productId,
      },
    });

    return { message: "Product added to wishlist successfully" };
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

    return { message: "Product removed from wishlist successfully" };
  }

  async clearWishlist(userId: string) {
    // Delete all wishlist items for user
    await this.prisma.wishlistItem.deleteMany({
      where: { userId },
    });

    return { message: "Wishlist cleared successfully" };
  }
}
