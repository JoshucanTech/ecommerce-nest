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
import { VendorBranchDto } from './dto/vendor-branch.dto';
import { generateSlug } from '../utils/slug-generator';
import { AdStatus, AdType, ApplicationStatus } from '@prisma/client';

import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { RbacService } from '../common/rbac';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private rbacService: RbacService,
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

  async getApplications(
    userId: string,
    params: {
      page: number;
      limit: number;
      status?: string;
    }
  ) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let where: any = {};

    if (status) {
      where.status = status;
    }

    if (user.role === 'SUB_ADMIN') {
      this.rbacService.checkPermission(
        user,
        'VENDORS' as any,
        ['VIEW' as any, 'MANAGE' as any]
      );

      const scopeFilter = this.rbacService.buildScopeFilter(
        user,
        'VENDORS' as any,
        ['VIEW' as any, 'MANAGE' as any],
        {
          addressField: 'businessAddress',
          includeLocation: true,
        }
      );

      if (scopeFilter) {
        where = { ...where, ...scopeFilter };
      }
    }

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
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id },
    });

    const vendorAddress = await this.prisma.vendorAddress.findFirst({
      where: { vendorApplicationId: id },
    });

    if (!application) {
      throw new NotFoundException(`Vendor application with ID ${id} not found`);
    }

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

    if (application.status === 'APPROVED') {
      throw new BadRequestException('Application is already approved');
    }

    const existingVendor = await this.prisma.vendor.findUnique({
      where: { userId: application.userId },
    });

    if (existingVendor) {
      throw new ConflictException('User is already a vendor');
    }

    const slug = await generateSlug(application.businessName, async (slug) => {
      const exists = await this.prisma.vendor.findUnique({
        where: { slug },
      });
      return !exists;
    });

    await this.prisma.user.update({
      where: { id: application.userId },
      data: { role: 'VENDOR' },
    });

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
      this.ordersService.getDashboardStats(userId),
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
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Vendor application with ID ${id} not found`);
    }

    if (application.status === 'REJECTED') {
      throw new BadRequestException('Application is already rejected');
    }

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

    const where: any = {
      isVerified: true,
    };

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'asc';
    } else {
      orderBy.rating = 'desc';
    }

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
      _count: vendor._count,
    };
  }

  async findBySlug(slug: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { slug },
      select: {
        id: true,
        businessName: true,
        slug: true,
        businessLogo: true,
        coverImage: true,
        themeColor: true,
        accentColor: true,
        tagline: true,
        customCSS: true,
        description: true,
        rating: true,
        totalRatings: true,
        isVerified: true,
        createdAt: true,
        businessEmail: true,
        businessPhone: true,
        website: true,
        businessAddress: {
          select: {
            street: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },

      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with slug ${slug} not found`);
    }

    return vendor;
  }

  async updateProfile(userId: string, updateVendorDto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

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

    const { businessAddress, ...updateData } = updateVendorDto;

    const vendorAddress = await this.prisma.vendorAddress.findFirst({
      where: { vendorId: vendor.id },
    });

    return this.prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        ...updateData,
        slug,
        ...(businessAddress && vendorAddress && {
          businessAddress: {
            update: {
              where: { id: vendorAddress.id },
              data: businessAddress,
            },
          },
        }),
        ...(businessAddress && !vendorAddress && {
          businessAddress: {
            create: businessAddress,
          },
        }),
      },
    });
  }

  async update(id: string, updateVendorDto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

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

    const { businessAddress, ...updateData } = updateVendorDto;

    const vendorAddress = await this.prisma.vendorAddress.findFirst({
      where: { vendorId: id },
    });

    return this.prisma.vendor.update({
      where: { id },
      data: {
        ...updateData,
        slug,
        ...(businessAddress && vendorAddress && {
          businessAddress: {
            update: {
              where: { id: vendorAddress.id },
              data: businessAddress,
            },
          },
        }),
        ...(businessAddress && !vendorAddress && {
          businessAddress: {
            create: businessAddress,
          },
        }),
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
              status: AdStatus.ACTIVE,
              type: AdType.FEATURED_VENDOR,
              endDate: { gte: new Date() },
              budget: { gt: 0 },
            },
          },
        },
      }),
    ]);

    if (featuredVendors.length === 0) {
      const [fallbackVendors, fallbackTotal] = await Promise.all([
        this.prisma.vendor.findMany({
          where: {
            status: ApplicationStatus.APPROVED,
            isVerified: true,
          },
          skip,
          take: limit,
          orderBy: { rating: 'desc' },
          include: {
            _count: {
              select: { products: true },
            },
          },
        }),
        this.prisma.vendor.count({
          where: {
            status: ApplicationStatus.APPROVED,
            isVerified: true,
          },
        }),
      ]);

      return {
        data: fallbackVendors.map(v => ({ ...v, productCount: v._count.products })),
        meta: {
          total: fallbackTotal,
          page,
          limit,
          totalPages: Math.ceil(fallbackTotal / limit),
        },
      };
    }

    return {
      data: featuredVendors.map(v => ({ ...v, productCount: v._count.products })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBranches(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendorAddress.findMany({
      where: { vendorId: vendor.id },
    });
  }

  async addBranch(userId: string, branchDto: VendorBranchDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendorAddress.create({
      data: {
        ...branchDto,
        vendorId: vendor.id,
      },
    });
  }

  async updateBranch(userId: string, id: string, branchDto: VendorBranchDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendorAddress.update({
      where: { id },
      data: branchDto,
    });
  }

  async deleteBranch(userId: string, id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendorAddress.delete({
      where: { id },
    });
  }
}
