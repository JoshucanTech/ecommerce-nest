import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(createReviewDto: CreateReviewDto, userId: string) {
    const { productId, rating, comment } = createReviewDto;

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check if user has already reviewed this product
    const existingReview = await this.prisma.review.findFirst({
      where: {
        productId,
        userId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        rating,
        comment,
        productId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Update product and vendor ratings
    await this.updateProductAndVendorRatings(productId, product.vendorId);

    return review;
  }

  async findByProduct(
    productId: string,
    params: { page: number; limit: number },
  ) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    // Calculate rating distribution
    const ratingDistribution = await this.prisma.$queryRaw`
      SELECT rating, COUNT(*) as count
      FROM reviews
      WHERE "productId" = ${productId}
      GROUP BY rating
      ORDER BY rating DESC
    `;

    // Calculate average rating
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        avgRating,
        ratingDistribution,
      },
    };
  }

  async findByUser(userId: string, params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where: { userId } }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, user: any) {
    // Check if review exists
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Check if user is the owner of the review
    if (review.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to update this review',
      );
    }

    // Update review
    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: updateReviewDto,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // If rating was updated, update product and vendor ratings
    if (updateReviewDto.rating !== undefined) {
      const product = (await this.prisma.product.findUnique({
        where: { id: review.productId },
        select: { vendorId: true },
      })) ?? { vendorId: '' };

      await this.updateProductAndVendorRatings(
        review.productId,
        product.vendorId,
      );
    }

    return updatedReview;
  }

  async remove(id: string, user: any) {
    // Check if review exists
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        product: {
          select: { vendorId: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    // Check if user is the owner of the review or an admin
    if (review.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to delete this review',
      );
    }

    // Delete review
    await this.prisma.review.delete({
      where: { id },
    });

    // Update product and vendor ratings
    await this.updateProductAndVendorRatings(
      review.productId,
      review.product.vendorId,
    );

    return { message: 'Review deleted successfully' };
  }

  private async updateProductAndVendorRatings(
    productId: string,
    vendorId: string,
  ) {
    // Update product rating
    const productReviews = await this.prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    // Update vendor rating
    const vendorProducts = await this.prisma.product.findMany({
      where: { vendorId },
      select: { id: true },
    });

    const vendorProductIds = vendorProducts.map((product) => product.id);

    const vendorReviews = await this.prisma.review.findMany({
      where: {
        productId: {
          in: vendorProductIds,
        },
      },
      select: { rating: true },
    });

    // Calculate average ratings
    const productAvgRating =
      productReviews.length > 0
        ? productReviews.reduce((sum, review) => sum + review.rating, 0) /
          productReviews.length
        : 0;

    const vendorAvgRating =
      vendorReviews.length > 0
        ? vendorReviews.reduce((sum, review) => sum + review.rating, 0) /
          vendorReviews.length
        : 0;

    // Update product and vendor
    await Promise.all([
      this.prisma.vendor.update({
        where: { id: vendorId },
        data: {
          // rating: vendorAvgRating,
          // totalRatings: vendorReviews.length,
        },
      }),
    ]);
  }
}
