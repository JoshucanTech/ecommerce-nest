import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { AdStatus, AdType, PricingModel, UserRole } from '@prisma/client';
import { AdPlatformsService } from './ad-platforms.service';
import { AdTargetingService } from './ad-targeting.service';

@Injectable()
export class AdvertisementsService {
  constructor(
    private prisma: PrismaService,
    private adPlatformsService: AdPlatformsService,
    private adTargetingService: AdTargetingService,
  ) {}

  async create(
    createAdvertisementDto: CreateAdvertisementDto,
    user: any,
    config?: JSON,
  ) {
    // Check if user is authorized to create an ad for this vendor
    if (
      user.role !== UserRole.ADMIN &&
      createAdvertisementDto.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to create advertisements for this vendor',
      );
    }

    // // Extract platforms and targeting from DTO
    // const { platforms, title, targeting, ...adData } = createAdvertisementDto

    // Extract platforms, targeting, and products from DTO
    const { platforms, targeting, title, products, ...adData } =
      createAdvertisementDto;

    // Set default maxProducts based on ad type if not provided
    if (!adData.maxProducts) {
      adData.maxProducts = adData.type === AdType.FEATURED_PRODUCT ? 10 : 1;
    }

    // Validate products count against maxProducts
    if (products && products.length > adData.maxProducts) {
      throw new BadRequestException(
        `This advertisement can only hold up to ${adData.maxProducts} products`,
      );
    }

    // Create advertisement
    const advertisement = await this.prisma.advertisement.create({
      data: {
        ...adData,
        status: AdStatus.DRAFT,
        title,
      },
    });

    // Create targeting if provided
    if (targeting) {
      await this.adTargetingService.createTargeting(
        advertisement.id,
        targeting,
      );
    }

    // Create product associations if provided
    if (products && products.length > 0) {
      await this.addProductsToAdvertisement(advertisement.id, products);
    }

    // Create platform configs if provided
    if (platforms && platforms.length > 0) {
      for (const platform of platforms) {
        await this.adPlatformsService.create(
          {
            advertisementId: advertisement.id,
            platform: platform as any,
            isActive: true,
            name: title,
            config,
          },
          user,
        );
      }
    }

    return this.findOne(advertisement.id, user);
  }

  async findAll(params: {
    page: number;
    limit: number;
    status?: AdStatus;
    vendorId?: string;
    user: any;
  }) {
    const { page, limit, status, vendorId, user } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (status) {
      where.status = status;
    }

    // If user is not an admin, they can only see their own vendor's ads
    if (user.role !== UserRole.ADMIN) {
      where.vendorId = user.vendorId;
    } else if (vendorId) {
      where.vendorId = vendorId;
    }

    // Get advertisements with pagination
    const [advertisements, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              businessLogo: true,
            },
          },
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  price: true,
                },
              },
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
          targeting: true,
          platformConfigs: {
            select: {
              id: true,
              platform: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.advertisement.count({ where }),
    ]);

    return {
      data: advertisements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: any) {
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            businessLogo: true,
          },
        },
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                price: true,
                description: true,
                category: true,
              },
            },
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
        targeting: true,
        platformConfigs: true,
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    // Check if user is authorized to view this advertisement
    if (
      user.role !== UserRole.ADMIN &&
      advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to view this advertisement',
      );
    }

    return advertisement;
  }

  async update(
    id: string,
    updateAdvertisementDto: UpdateAdvertisementDto,
    user: any,
    config?: JSON,
    name?: string,
  ) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    // Check if user is authorized to update this advertisement
    if (
      user.role !== UserRole.ADMIN &&
      advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to update this advertisement',
      );
    }

    // Check if advertisement is in a state that can be updated
    if (
      advertisement.status !== AdStatus.DRAFT &&
      advertisement.status !== AdStatus.REJECTED &&
      user.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException(
        'Advertisement can only be updated when in DRAFT or REJECTED status',
      );
    }

    // Extract platforms and targeting from DTO
    const { platforms, products, targeting, ...adData } =
      updateAdvertisementDto;

    // If maxProducts is being updated, validate it against current products
    if (adData.maxProducts !== undefined) {
      const currentProductCount = advertisement.products.length;
      if (adData.maxProducts < currentProductCount) {
        throw new BadRequestException(
          `Cannot reduce maxProducts below current product count (${currentProductCount})`,
        );
      }
    }

    // Update advertisement
    await this.prisma.advertisement.update({
      where: { id },
      data: adData,
    });

    // Update targeting if provided
    if (targeting) {
      // await this.adTargetingService.updateTargeting(id, targeting, user)
      await this.adTargetingService.updateTargeting(id, targeting);
    }

    // Update products if provided
    if (products) {
      // First, remove all existing product associations
      await this.prisma.productAdvertisement.deleteMany({
        where: { advertisementId: id },
      });

      // Then add the new products
      await this.addProductsToAdvertisement(id, products);
    }

    // Update platform configs if provided
    if (platforms && platforms.length > 0) {
      // Get existing platform configs
      const existingConfigs = await this.prisma.adPlatformConfig.findMany({
        where: { advertisementId: id },
      });

      // Create new platform configs
      for (const platform of platforms) {
        const existingConfig = existingConfigs.find(
          (config) => config.platform === platform,
        );

        if (!existingConfig) {
          await this.adPlatformsService.create(
            {
              advertisementId: id,
              platform: platform as any,
              isActive: true,
              name,
              config,
            },
            user,
          );
        }
      }

      // Deactivate removed platform configs
      for (const config of existingConfigs) {
        if (!platforms.includes(config.platform)) {
          await this.prisma.adPlatformConfig.update({
            where: { id: config.id },
            data: { isActive: false },
          });
        }
      }
    }

    return this.findOne(id, user);
  }

  async remove(id: string, user: any) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
    });

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    // Check if user is authorized to delete this advertisement
    if (
      user.role !== UserRole.ADMIN &&
      advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to delete this advertisement',
      );
    }

    // Delete advertisement
    await this.prisma.advertisement.delete({
      where: { id },
    });

    return { message: 'Advertisement deleted successfully' };
  }

  async updateStatus(id: string, status: AdStatus, user: any) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
    });

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    // Check if user is authorized to update this advertisement
    if (
      user.role !== UserRole.ADMIN &&
      advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to update this advertisement',
      );
    }

    // Validate status transitions
    this.validateStatusTransition(advertisement.status, status, user.role);

    // Update advertisement status
    const updatedAd = await this.prisma.advertisement.update({
      where: { id },
      data: {
        status,
        reviewedBy:
          status === AdStatus.ACTIVE || status === AdStatus.REJECTED
            ? user.id
            : undefined,
        reviewedAt:
          status === AdStatus.ACTIVE || status === AdStatus.REJECTED
            ? new Date()
            : undefined,
      },
    });

    // If status is ACTIVE, sync with external platforms
    if (status === AdStatus.ACTIVE) {
      const platformConfigs = await this.prisma.adPlatformConfig.findMany({
        where: { advertisementId: id, isActive: true },
      });

      for (const config of platformConfigs) {
        await this.adPlatformsService.syncWithPlatform(config.id, user);
      }
    }

    return updatedAd;
  }

  async rejectAdvertisement(id: string, notes: string, user: any) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
    });

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    // Check if user is authorized to reject this advertisement
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You are not authorized to reject this advertisement',
      );
    }

    // Update advertisement status
    const updatedAd = await this.prisma.advertisement.update({
      where: { id },
      data: {
        status: AdStatus.REJECTED,
        reviewNotes: notes,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    return updatedAd;
  }

  // Helper method to add products to an advertisement
  private async addProductsToAdvertisement(
    advertisementId: string,
    products: any[],
  ) {
    // Get the advertisement to check maxProducts
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id: advertisementId },
    });

    if (!advertisement) {
      throw new NotFoundException(
        `Advertisement with ID ${advertisementId} not found`,
      );
    }

    // Validate products count against maxProducts
    if (products.length > advertisement.maxProducts) {
      throw new BadRequestException(
        `This advertisement can only hold up to ${advertisement.maxProducts} products`,
      );
    }

    // Create product associations
    const productAssociations = products.map((product, index) => ({
      advertisementId,
      productId: product.productId,
      displayOrder:
        product.displayOrder !== undefined ? product.displayOrder : index,
      customTitle: product.customTitle,
      customDescription: product.customDescription,
      customImageUrl: product.customImageUrl,
      customPrice: product.customPrice,
    }));

    // Create all product associations
    await this.prisma.productAdvertisement.createMany({
      data: productAssociations,
      skipDuplicates: true,
    });
  }

  // Add a method to manage products in an advertisement
  async manageAdvertisementProducts(id: string, productData: any, user: any) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`);
    }

    // Check if user is authorized to update this advertisement
    if (
      user.role !== UserRole.ADMIN &&
      advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to update this advertisement',
      );
    }

    // Check if advertisement is in a state that can be updated
    if (
      advertisement.status !== AdStatus.DRAFT &&
      advertisement.status !== AdStatus.REJECTED &&
      user.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException(
        'Advertisement can only be updated when in DRAFT or REJECTED status',
      );
    }

    const { action, products } = productData;

    switch (action) {
      case 'add':
        // Check if adding these products would exceed maxProducts
        if (
          advertisement.products.length + products.length >
          advertisement.maxProducts
        ) {
          throw new BadRequestException(
            `Cannot add ${products.length} more products. This would exceed the maximum of ${advertisement.maxProducts} products.`,
          );
        }

        // Add products
        await this.addProductsToAdvertisement(id, products);
        break;

      case 'remove':
        // Remove products
        const productIds = products.map((p) => p.productId);
        await this.prisma.productAdvertisement.deleteMany({
          where: {
            advertisementId: id,
            productId: { in: productIds },
          },
        });
        break;

      case 'update':
        // Update product details
        for (const product of products) {
          await this.prisma.productAdvertisement.updateMany({
            where: {
              advertisementId: id,
              productId: product.productId,
            },
            data: {
              displayOrder: product.displayOrder,
              customTitle: product.customTitle,
              customDescription: product.customDescription,
              customImageUrl: product.customImageUrl,
              customPrice: product.customPrice,
            },
          });
        }
        break;

      case 'reorder':
        // Reorder products
        for (const product of products) {
          await this.prisma.productAdvertisement.updateMany({
            where: {
              advertisementId: id,
              productId: product.productId,
            },
            data: {
              displayOrder: product.displayOrder,
            },
          });
        }
        break;

      default:
        throw new BadRequestException(`Invalid action: ${action}`);
    }

    return this.findOne(id, user);
  }

  private validateStatusTransition(
    currentStatus: AdStatus,
    newStatus: AdStatus,
    userRole: UserRole,
  ) {
    // Define allowed transitions based on current status and user role
    const allowedTransitions: Record<AdStatus, Record<UserRole, AdStatus[]>> = {
      [AdStatus.DRAFT]: {
        [UserRole.VENDOR]: [AdStatus.PENDING_APPROVAL],
        [UserRole.ADMIN]: [
          AdStatus.PENDING_APPROVAL,
          AdStatus.ACTIVE,
          AdStatus.REJECTED,
          AdStatus.ARCHIVED,
        ],
        [UserRole.SUB_ADMIN]: [
          AdStatus.PENDING_APPROVAL,
          AdStatus.ACTIVE,
          AdStatus.REJECTED,
        ],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.PENDING_APPROVAL]: {
        [UserRole.VENDOR]: [AdStatus.DRAFT, AdStatus.ARCHIVED],
        [UserRole.ADMIN]: [
          AdStatus.ACTIVE,
          AdStatus.REJECTED,
          AdStatus.DRAFT,
          AdStatus.ARCHIVED,
        ],
        [UserRole.SUB_ADMIN]: [AdStatus.ACTIVE, AdStatus.REJECTED],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.ACTIVE]: {
        [UserRole.VENDOR]: [AdStatus.PAUSED, AdStatus.ARCHIVED],
        [UserRole.ADMIN]: [
          AdStatus.PAUSED,
          AdStatus.REJECTED,
          AdStatus.COMPLETED,
          AdStatus.ARCHIVED,
        ],
        [UserRole.SUB_ADMIN]: [AdStatus.PAUSED, AdStatus.COMPLETED],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.PAUSED]: {
        [UserRole.VENDOR]: [AdStatus.ACTIVE, AdStatus.ARCHIVED],
        [UserRole.ADMIN]: [
          AdStatus.ACTIVE,
          AdStatus.REJECTED,
          AdStatus.COMPLETED,
          AdStatus.ARCHIVED,
        ],
        [UserRole.SUB_ADMIN]: [
          AdStatus.ACTIVE,
          AdStatus.REJECTED,
          AdStatus.COMPLETED,
        ],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.REJECTED]: {
        [UserRole.VENDOR]: [AdStatus.DRAFT, AdStatus.ARCHIVED],
        [UserRole.ADMIN]: [
          AdStatus.DRAFT,
          AdStatus.ACTIVE,
          AdStatus.PENDING_APPROVAL,
          AdStatus.ARCHIVED,
        ],
        [UserRole.SUB_ADMIN]: [
          AdStatus.DRAFT,
          AdStatus.ACTIVE,
          AdStatus.PENDING_APPROVAL,
        ],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.COMPLETED]: {
        [UserRole.VENDOR]: [AdStatus.ARCHIVED],
        [UserRole.ADMIN]: [AdStatus.ACTIVE, AdStatus.ARCHIVED],
        [UserRole.SUB_ADMIN]: [AdStatus.ACTIVE],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.ARCHIVED]: {
        [UserRole.VENDOR]: [AdStatus.DRAFT],
        [UserRole.ADMIN]: [
          AdStatus.DRAFT,
          AdStatus.ACTIVE,
          AdStatus.PENDING_APPROVAL,
        ],
        [UserRole.SUB_ADMIN]: [
          AdStatus.DRAFT,
          AdStatus.ACTIVE,
          AdStatus.PENDING_APPROVAL,
        ],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
    };

    if (!allowedTransitions[currentStatus][userRole].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition advertisement from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  async getFeaturedProducts(params: {
    page: number;
    limit: number;
    categoryId?: string;
  }) {
    const { page, limit, categoryId } = params;
    const skip = (page - 1) * limit;

    // Build where conditions for advertisements
    const adWhere: any = {
      status: AdStatus.ACTIVE,
      type: AdType.FEATURED_PRODUCT,
    };

    // Build where conditions for products if categoryId is provided
    const productWhere: any = {};
    if (categoryId) {
      productWhere.product = {
        categoryId,
      };
    }

    // Get featured products with pagination
    const [featuredProducts, total] = await Promise.all([
      this.prisma.productAdvertisement.findMany({
        where: {
          advertisement: adWhere,
          ...productWhere,
        },
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          advertisement: {
            select: {
              id: true,
              title: true,
              description: true,
              imageUrl: true,
              startDate: true,
              endDate: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              discountPrice: true,
              images: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
              reviews: {
                select: {
                  rating: true,
                },
              },
              vendor: {
                select: {
                  id: true,
                  businessName: true,
                  businessLogo: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.productAdvertisement.count({
        where: {
          advertisement: adWhere,
          ...productWhere,
        },
      }),
    ]);

    // Transform the data to make it more client-friendly
    const transformedProducts = featuredProducts.map((item) => ({
      id: item.product.id,
      name: item.customTitle || item.product.name,
      description: item.customDescription || item.product.description,
      price: item.customPrice || item.product.price,
      discountPrice: item.product.discountPrice,
      images: item.customImageUrl
        ? [item.customImageUrl, ...item.product.images]
        : item.product.images,
      category: item.product.category,
      vendor: item.product.vendor,
      reviewCount: item.product.reviews.length,
      avgRating:
        item.product.reviews.length > 0
          ? item.product.reviews.reduce(
              (sum, review) => sum + review.rating,
              0,
            ) / item.product.reviews.length
          : 0,
      advertisement: {
        id: item.advertisement.id,
        title: item.advertisement.title,
        description: item.advertisement.description,
        imageUrl: item.advertisement.imageUrl,
      },
      isFeatured: true,
      displayOrder: item.displayOrder,
    }));

    return {
      data: transformedProducts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
