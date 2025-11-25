import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { generateSlug } from '../utils/slug-generator';
import { ProductValidationService } from './product-validation.service';
import { ProductCalculatorService } from './product-calculator.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private productValidationService: ProductValidationService,
    private productCalculatorService: ProductCalculatorService,
  ) {}

  async create(createProductDto: CreateProductDto, userId: string) {
    // Get vendor ID from user
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new ForbiddenException('User is not a vendor');
    }

    // Generate slug from product name
    const slug = await generateSlug(createProductDto.name, async (slug) => {
      const exists = await this.prisma.product.findUnique({
        where: { slug },
      });
      return !exists;
    });

    // Create product
    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        slug,
        vendorId: vendor.id,
      },
    });

    // Create inventory record
    // await this.prisma.inventory.create({
    //   data: {
    //     productId: product.id,
    //     vendorId: vendor.id,
    //     quantity: createProductDto.quantity,
    //   },
    // })

    return product;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    vendor?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page,
      limit,
      search,
      category,
      vendor,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {
      isPublished: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = {
        some: {
          OR: [{ id: category }, { slug: category }],
        },
      };
    }

    if (vendor) {
      where.vendor = {
        OR: [{ id: vendor }, { slug: vendor }],
      };
    }

    if (minPrice !== undefined) {
      where.price = {
        ...where.price,
        gte: minPrice,
      };
    }

    if (maxPrice !== undefined) {
      where.price = {
        ...where.price,
        lte: maxPrice,
      };
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
              // rating: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Calculate average rating for each product
    const productsWithRating = products.map((product) => {
      const { avgRating, reviewCount } = this.productCalculatorService.calculateProductRatings(product.reviews);
      const { reviews, ...rest } = product;
      
      return {
        ...rest,
        avgRating,
        reviewCount,
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

  async findOne(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
            id: true,
          },
        },
        ProductVariant: true,
        features: true,
        specifications: true,
        inBoxItems: true,
        inventory: true,
        // wishlistItems: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            businessLogo: true,
            rating: true,
            isVerified: true,
            totalRatings: true,
            OrderShipping: true,
            Shipping: true,
            ShippingPolicy: true,
          },
        },
        reviews: {
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
        },
        shippingOptions: true,
        shippingPolicy: true,
        // inventory: true,
        flashSaleItems: {
          include: {
            flashSale: {
              // where: {
              //   isActive: true,
              //   startDate: { lte: new Date() },
              //   endDate: { gte: new Date() },
              // },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID or slug ${idOrSlug} not found`,
      );
    }

    // Calculate product ratings
    const { avgRating, reviewCount, ratingDistribution } = this.productCalculatorService.calculateProductRatings(product.reviews);
    
    // Calculate flash sale price
    const { flashSalePrice, activeFlashSale } = this.productCalculatorService.calculateFlashSalePrice(product);
    
    // Generate short description
    const shortDescription = this.productCalculatorService.generateShortDescription(product.description);
    
    // Get shipping information
    const shippingInfo = this.productCalculatorService.calculateShippingInfo(product.vendor);

    return {
      ...product,
      avgRating,
      reviewCount: product.reviews.length,
      ratingDistribution,
      flashSalePrice,
      shortDescription,
      activeFlashSale: activeFlashSale
        ? {
            id: activeFlashSale.id,
            name: activeFlashSale.name,
            discountPercentage: activeFlashSale.discountPercentage,
            endDate: activeFlashSale.endDate,
          }
        : null,
      shippingInfo, // Add shipping information for display
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: any) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check if user is the vendor of the product or an admin
    if (user.role !== 'ADMIN' && product.vendor.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to update this product',
      );
    }

    // Update slug if name is changed
    let slug = product.slug;
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      slug = await generateSlug(updateProductDto.name, async (newSlug) => {
        const exists = await this.prisma.product.findFirst({
          where: {
            slug: newSlug,
            id: { not: id },
          },
        });
        return !exists;
      });
    }

    // Update product
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        slug,
      },
    });

    // Update inventory if quantity is provided
    if (updateProductDto.quantity !== undefined) {
      // await this.prisma.inventory.update({
      //   where: { productId: id },
      //   data: { quantity: updateProductDto.quantity },
      // })
    }

    return updatedProduct;
  }

  async remove(id: string, user: any) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check if user is the vendor of the product or an admin
    if (user.role !== 'ADMIN' && product.vendor.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this product',
      );
    }

    // Delete product
    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Product deleted successfully' };
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

  // Record product view
  async recordView({
    productId,
    userId,
    sessionId,
  }: {
    productId: string;
    userId?: string;
    sessionId?: string;
  }) {
    console.log('userId', userId);
    console.log('sessionId', sessionId);
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

  // Get recently viewed products
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

  async getRecentlyViewed(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId must be provided');
    }

    console.log('sessionId is now: ', sessionId);

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
