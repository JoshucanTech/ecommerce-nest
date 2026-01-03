import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorApplicationDto } from './dto/create-vendor-application.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { UpdateVendorApplicationDto } from './dto/update-vendor-application.dto';
import { generateSlug } from '../utils/slug-generator';
import { AdStatus, AdType, ApplicationStatus } from '@prisma/client';

import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private productsService: ProductsService,
  ) { }

  async apply(
    createVendorApplicationDto: CreateVendorApplicationDto,
    userId: string,
  ) {
    // Check if user already has an application
    const existingApplication = await this.prisma.vendorApplication.findUnique({
      where: { userId },
    });

    if (existingApplication) {
      throw new ConflictException('User already has a vendor application');
    }

    // Check if user is already a vendor
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (existingVendor) {
      throw new ConflictException('User is already a vendor');
    }

    // Check if business email is unique
    const emailExists = await this.prisma.vendorApplication.findUnique({
      where: { businessEmail: createVendorApplicationDto.businessEmail },
    });

    if (emailExists) {
      throw new ConflictException('Business email already in use');
    }

    // Create vendor application
    return this.prisma.vendorApplication.create({
      data: {
        ...createVendorApplicationDto,
        userId,

        businessAddress: {
          create: [
            {
              street: '123 Main St',
              city: 'New York',
              country: 'USA',
              postalCode: '10001',
              state: 'NY',
            },
          ],
        },
      },
    });
  }

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Get vendor applications with pagination.
   *
   * @param {number} page
   * @param {number} limit
   * @param {string} [status]
   * @returns {Promise<{ data: VendorApplication[], meta: { total: number, page: number, limit: number, totalPages: number } }>}
   */
  /**
   * Get vendor applications with pagination.
   *
   * @param {number} page
   * @param {number} limit
   * @param {string} [status]
   * @returns {Promise<{ data: VendorApplication[], meta: { total: number, page: number, limit: number, totalPages: number } }>}
   */
  /*******  bab8d9c7-566d-48a4-a486-2c4bb81f8484  *******/
  async getApplications(params: {
    page: number;
    limit: number;
    status?: string;
  }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (status) {
      where.status = status;
    }

    // Get applications with pagination
    const [applications, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.vendorApplication.count({ where }),
    ]);

    return {
      data: applications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getApplicationByUserId(userId: string) {
    const application = await this.prisma.vendorApplication.findUnique({
      where: { userId },
    });

    if (!application) {
      throw new NotFoundException('Vendor application not found');
    }

    return application;
  }

  async getApplicationById(id: string) {
    const application = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Vendor application with ID ${id} not found`);
    }

    return application;
  }

  async updateApplication(
    id: string,
    updateVendorApplicationDto: UpdateVendorApplicationDto,
  ) {
    // Check if application exists
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id },
    });

    const vendorAddress = await this.prisma.vendorAddress.findFirst({
      where: { vendorApplicationId: id },
    });

    if (!application) {
      throw new NotFoundException(`Vendor application with ID ${id} not found`);
    }

    // Check if business email is unique if being updated
    if (
      updateVendorApplicationDto.businessEmail &&
      updateVendorApplicationDto.businessEmail !== application.businessEmail
    ) {
      const emailExists = await this.prisma.vendorApplication.findFirst({
        where: {
          businessEmail: updateVendorApplicationDto.businessEmail,
          id: { not: id },
        },
      });

      if (emailExists) {
        throw new ConflictException('Business email already in use');
      }
    }

    // Update application
    return this.prisma.vendorApplication.update({
      where: { id },
      data: {
        ...updateVendorApplicationDto,
        businessAddress: {
          update: {
            where: { id: vendorAddress.id },
            data: {
              street: updateVendorApplicationDto.businessAddress.street,
              city: updateVendorApplicationDto.businessAddress.city,
              country: updateVendorApplicationDto.businessAddress.country,
              postalCode: updateVendorApplicationDto.businessAddress.postalCode,
              state: updateVendorApplicationDto.businessAddress.state,
            },
          },
        },
      },
    });
  }

  async approveApplication(id: string) {
    // Check if application exists
    const application = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: true,
        businessAddress: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Vendor application with ID ${id} not found`);
    }

    // Check if application is already approved
    if (application.status === 'APPROVED') {
      throw new BadRequestException('Application is already approved');
    }

    // Check if user is already a vendor
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { userId: application.userId },
    });

    if (existingVendor) {
      throw new ConflictException('User is already a vendor');
    }

    // Generate slug from business name
    const slug = await generateSlug(application.businessName, async (slug) => {
      const exists = await this.prisma.vendor.findUnique({
        where: { slug },
      });
      return !exists;
    });

    // Update user role to VENDOR
    await this.prisma.user.update({
      where: { id: application.userId },
      data: { role: 'VENDOR' },
    });

    // Create vendor
    const vendor = await this.prisma.vendor.create({
      data: {
        userId: application.userId,
        businessName: application.businessName,
        businessEmail: application.businessEmail,
        businessPhone: application.businessPhone,
        businessLogo: application.businessLogo,
        description: application.description,
        slug,
        businessAddress: {
          create: {
            street: application.businessAddress[0].street,
            city: application.businessAddress[0].city,
            country: application.businessAddress[0].country,
            postalCode: application.businessAddress[0].postalCode,
            state: application.businessAddress[0].state,
          },
        },
      },
    });

    // Update application status
    await this.prisma.vendorApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        notes: 'Application approved. Vendor account created.',
      },
    });

    return {
      message: 'Application approved successfully',
      vendor,
    };
  }

  async getDashboardStats(userId: string) {
    const [stats, productCount] = await Promise.all([
      this.ordersService.getVendorStats(userId),
      this.prisma.product.count({
        where: {
          vendor: { userId },
        },
      }),
    ]);

    return {
      ...stats,
      productCount,
    };
  }

  async rejectApplication(id: string, notes?: string) {
    // Check if application exists
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Vendor application with ID ${id} not found`);
    }

    // Check if application is already rejected
    if (application.status === 'REJECTED') {
      throw new BadRequestException('Application is already rejected');
    }

    // Update application status
    await this.prisma.vendorApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: notes || 'Application rejected.',
      },
    });

    return {
      message: 'Application rejected successfully',
    };
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, search, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {
      isVerified: true,
    };

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'asc';
    } else {
      orderBy.rating = 'desc';
    }

    // Get vendors with pagination
    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    // Process vendors
    const processedVendors = vendors.map((vendor) => ({
      ...vendor,
      productCount: vendor._count.products,
      _count: undefined,
    }));

    return {
      data: processedVendors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrSlug: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isVerified: true,
      },
      include: {
        products: {
          take: 8,
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            discountPrice: true,
            images: true,
          },
        },
        Shipping: {
          where: { isActive: true },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(
        `Vendor with ID or slug ${idOrSlug} not found`,
      );
    }

    return {
      ...vendor,
      productCount: vendor._count.products,
      _count: undefined,
    };
  }

  async updateProfile(userId: string, updateVendorDto: UpdateVendorDto) {
    // Get vendor by user ID
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // Check if business email is unique if being updated
    if (
      updateVendorDto.businessEmail &&
      updateVendorDto.businessEmail !== vendor.businessEmail
    ) {
      const emailExists = await this.prisma.vendor.findFirst({
        where: {
          businessEmail: updateVendorDto.businessEmail,
          id: { not: vendor.id },
        },
      });

      if (emailExists) {
        throw new ConflictException('Business email already in use');
      }
    }

    // Update slug if business name is changed
    let slug = vendor.slug;
    if (
      updateVendorDto.businessName &&
      updateVendorDto.businessName !== vendor.businessName
    ) {
      slug = await generateSlug(
        updateVendorDto.businessName,
        async (newSlug) => {
          const exists = await this.prisma.vendor.findFirst({
            where: {
              slug: newSlug,
              id: { not: vendor.id },
            },
          });
          return !exists;
        },
      );
    }

    // Update vendor
    return this.prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        ...updateVendorDto,
        slug,
        businessAddress: {
          update: {
            where: { id: vendor.id },
            data: {
              ...updateVendorDto.businessAddress,
            },
          },
        },
      },
    });
  }

  async update(id: string, updateVendorDto: UpdateVendorDto) {
    // Check if vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    // Check if business email is unique if being updated
    if (
      updateVendorDto.businessEmail &&
      updateVendorDto.businessEmail !== vendor.businessEmail
    ) {
      const emailExists = await this.prisma.vendor.findFirst({
        where: {
          businessEmail: updateVendorDto.businessEmail,
          id: { not: id },
        },
      });

      if (emailExists) {
        throw new ConflictException('Business email already in use');
      }
    }

    // Update slug if business name is changed
    let slug = vendor.slug;
    if (
      updateVendorDto.businessName &&
      updateVendorDto.businessName !== vendor.businessName
    ) {
      slug = await generateSlug(
        updateVendorDto.businessName,
        async (newSlug) => {
          const exists = await this.prisma.vendor.findFirst({
            where: {
              slug: newSlug,
              id: { not: id },
            },
          });
          return !exists;
        },
      );
    }

    // Update vendor
    return this.prisma.vendor.update({
      where: { id },
      data: {
        ...updateVendorDto,
        slug,
        businessAddress: {
          update: {
            where: { id },
            data: {
              ...updateVendorDto.businessAddress,
            },
          },
        },
      },
    });
  }

  async getFeaturedVendors(params: {
    page: number;
    limit: number;
    spotlight?: boolean;
  }) {
    const { page, limit, spotlight } = params;
    const skip = (page - 1) * limit;

    // If spotlight is true, we want to get the top featured vendor
    const orderBy = spotlight
      ? [
        { displayOrder: 'asc' },
        { advertisement: { budget: 'desc' } },
        { createdAt: 'desc' },
      ]
      : [{ displayOrder: 'asc' }, { createdAt: 'desc' }];

    // Get featured vendors with pagination
    const [featuredVendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where: {
          status: ApplicationStatus.APPROVED,
          isVerified: true,
          advertisements: {
            some: {
              status: AdStatus.ACTIVE,
              type: AdType.FEATURED_VENDOR,
              endDate: { gte: new Date() },
              budget: { gt: 0 },
            },
          },
        },
        skip,
        take: limit,
        // orderBy,
        include: {
          advertisements: {
            select: {
              id: true,
              title: true,
              description: true,
              imageUrl: true,
              startDate: true,
              endDate: true,
            },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
      }),
      this.prisma.vendor.count({
        where: {
          status: ApplicationStatus.APPROVED,
          isVerified: true,
          advertisements: {
            some: {
              status: AdStatus.COMPLETED,
              type: AdType.FEATURED_VENDOR,
              endDate: { gte: new Date() },
              budget: { gt: 0 },
            },
          },
        },
      }),
    ]);

    // Transform the data to make it more client-friendly
    // const transformedVendors = featuredVendors.map((item) => ({
    //   id: item.vendor.id,
    //   name: item.customTitle || item.vendor.businessName,
    //   description: item.customDescription || item.vendor.description,
    //   logo: item.customImageUrl || item.vendor.businessLogo,
    //   coverImage: item.vendor.coverImage,
    //   isVerified: item.vendor.isVerified,
    //   rating: item.vendor.rating,
    //   productCount: item.vendor.products.length,
    //   slug: item.vendor.slug,
    //   location: item.vendor.businessAddress,
    //   joinDate: item.vendor.createdAt,
    //   // specialties: item.vendor.specialties,
    //   advertisement: {
    //     id: item.advertisement.id,
    //     title: item.advertisement.title,
    //     description: item.advertisement.description,
    //     imageUrl: item.advertisement.imageUrl,
    //   },
    //   isFeatured: true,
    //   displayOrder: item.displayOrder,
    //   // Include featured products if this is a spotlight vendor
    //   ...(spotlight && item.vendor.products
    //     ? {
    //         featuredProducts: item.vendor.products.map((product) => ({
    //           id: product.id,
    //           name: product.name,
    //           image: product.images[0] || '/placeholder.svg',
    //           price: product.price,
    //           slug: product.slug,
    //         })),
    //       }
    //     : {}),
    // }));

    return {
      data: featuredVendors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
