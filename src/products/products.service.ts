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
import { RbacService } from '../common/rbac';

const productListSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  price: true,
  discountPrice: true,
  images: true,
  vendorId: true,
} as const;

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private productValidationService: ProductValidationService,
    private productCalculatorService: ProductCalculatorService,
    private rbacService: RbacService,
  ) { }

  async create(createProductDto: CreateProductDto, userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new ForbiddenException('User is not a vendor');
    }

    const slug = await generateSlug(createProductDto.name, async (slug) => {
      const exists = await this.prisma.product.findUnique({
        where: { slug },
      });
      return !exists;
    });

    const { categoryIds, ...rest } = createProductDto;

    const product = await this.prisma.product.create({
      data: {
        ...rest,
        slug,
        vendorId: vendor.id,
        ...(categoryIds && categoryIds.length > 0 && {
          categories: {
            connect: categoryIds.map((id) => ({ id })),
          },
        }),
      },
    });

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
    storefrontVendorId?: string;
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
      storefrontVendorId,
    } = params;
    const skip = (page - 1) * limit;

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
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      where.categories = {
        some: isUuid ? { id: category } : { slug: category },
      };
    }

    if (vendor) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vendor);
      where.vendor = isUuid ? { id: vendor } : { slug: vendor };
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

    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: productListSelect,
      }),
      this.prisma.product.count({ where }),
    ]);

    // storefrontVendorId prioritization logic
    let processedProducts = products;
    if (storefrontVendorId) {
      processedProducts = products.sort((a, b) => {
        if (a.vendorId === storefrontVendorId && b.vendorId !== storefrontVendorId) return -1;
        if (a.vendorId !== storefrontVendorId && b.vendorId === storefrontVendorId) return 1;
        return 0;
      });
    }

    const productSummaries = processedProducts.map(
      ({ vendorId, images, ...product }) => ({
        ...product,
        images: images?.slice(0, 1) ?? [],
      }),
    );

    return {
      data: productSummaries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVendorProducts(actorId: string, vendorUserId?: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      include: {
        positions: {
          include: {
            positionPermissions: {
              include: { permission: true },
            },
          },
        },
        subAdminProfile: true,
      },
    });

    if (!actor) {
      throw new NotFoundException('User not found');
    }

    let where: any = {};

    if (vendorUserId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { userId: vendorUserId },
      });

      if (!vendor) {
        throw new ForbiddenException('User is not a vendor');
      }
      where = { vendorId: vendor.id };
    }

    if (actor.role === 'SUB_ADMIN') {
      this.rbacService.checkPermission(
        actor,
        'PRODUCTS' as any,
        ['VIEW' as any]
      );

      const scopeFilter = this.rbacService.buildScopeFilter(
        actor,
        'PRODUCTS' as any,
        ['VIEW' as any],
        {
          includeLocation: true,
        }
      );

      if (scopeFilter) {
        where.vendor = {
          businessAddress: scopeFilter
        };
      }
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        shortDescription: true,
        price: true,
        discountPrice: true,
        quantity: true,
        sku: true,
        images: true,
        isPublished: true,
        vendorId: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        warrantyInfo: true,
        returnPolicy: true,
        metaTitle: true,
        metaDescription: true,
        tags: true,
      },
    });

    return products.map((product) => {
      const { images, ...productData } = product;
      return { ...productData, images: images?.slice(0, 1) ?? [] };
    });
  }

  async findOne(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        categories: {
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
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            businessLogo: true,
            rating: true,
            isVerified: true,
            totalRatings: true,
            Shipping: {
              select: {
                id: true,
                name: true,
                deliveryTime: true,
                price: true,
                isActive: true,
                shippingType: true,
              },
            },
            ShippingPolicy: {
              select: { processingTime: true },
            },
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
        shippingPolicy: true,
        flashSaleItems: {
          include: {
            flashSale: {
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
    const { avgRating, reviewCount, ratingDistribution } =
      this.productCalculatorService.calculateProductRatings(product.reviews);

    // Calculate flash sale price
    const { flashSalePrice, activeFlashSale } =
      this.productCalculatorService.calculateFlashSalePrice(product);

    // Generate short description
    const shortDescription =
      this.productCalculatorService.generateShortDescription(
        product.description,
      );

    // Get shipping information
    const shippingInfo = this.productCalculatorService.calculateShippingInfo(
      product.vendor,
    );

    return {
      ...product,
      category: product.categories,
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (user.role !== 'ADMIN' && product.vendor.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to update this product',
      );
    }

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

    const { categoryIds, ...rest } = updateProductDto;

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        slug,
        ...(categoryIds && {
          categories: {
            set: categoryIds.map((id) => ({ id })),
          },
        }),
      },
    });

    return updatedProduct;
  }

  async remove(id: string, user: any) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (user.role !== 'ADMIN' && product.vendor.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this product',
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Product deleted successfully' };
  }

  async getNewProducts(limit = 10, page = 1) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 14);
    const skip = (page - 1) * limit;
    const where = {
      isPublished: true,
      createdAt: { gte: daysAgo },
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: productListSelect,
      }),
      this.prisma.product.count({ where }),
    ]);

    const productSummaries = products.map((product) => {
      const { vendorId, images, ...productData } = product;
      return { ...productData, images: images?.slice(0, 1) ?? [] };
    });

    return {
      data: productSummaries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

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

    await this.prisma.recentlyViewedProduct.deleteMany({
      where: {
        productId,
        ...(userId ? { userId } : { sessionId }),
      },
    });

    await this.prisma.recentlyViewedProduct.create({
      data: {
        productId,
        userId,
        sessionId,
        viewedAt: new Date(),
      },
    });

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

  async getFrequentlyBoughtTogether(productId: string, limit = 5) {
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

    const recommendedIds = Array.from(productFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([recommendedProductId]) => recommendedProductId);

    const recommendedProducts = await this.prisma.product.findMany({
      where: {
        id: { in: recommendedIds },
      },
      select: productListSelect,
    });
    const productsById = new Map(
      recommendedProducts.map((product) => [product.id, product]),
    );

    return recommendedIds
      .map((id) => productsById.get(id))
      .filter((product) => product !== undefined)
      .map(({ vendorId, images, ...product }) => ({
        ...product,
        images: images?.slice(0, 1) ?? [],
      }));
  }

  async getRecentlyViewed(
    userId?: string,
    sessionId?: string,
    vendorSlug?: string,
  ) {
    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId must be provided');
    }

    const views = await this.prisma.recentlyViewedProduct.findMany({
      where: {
        ...(userId ? { userId } : { sessionId }),
        ...(vendorSlug ? { product: { vendor: { slug: vendorSlug } } } : {}),
      },
      orderBy: { viewedAt: 'desc' },
      take: 10,
      include: {
        product: {
          select: productListSelect,
        },
      },
    });

    return views.map(({ product }) => {
      const { vendorId, images, ...productData } = product;
      return { ...productData, images: images?.slice(0, 1) ?? [] };
    });
  }
}
