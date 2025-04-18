import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVendorApplicationDto } from "./dto/create-vendor-application.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { UpdateVendorApplicationDto } from "./dto/update-vendor-application.dto";
import { generateSlug } from "../utils/slug-generator";

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async apply(
    createVendorApplicationDto: CreateVendorApplicationDto,
    userId: string,
  ) {
    // Check if user already has an application
    const existingApplication = await this.prisma.vendorApplication.findUnique({
      where: { userId },
    });

    if (existingApplication) {
      throw new ConflictException("User already has a vendor application");
    }

    // Check if user is already a vendor
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (existingVendor) {
      throw new ConflictException("User is already a vendor");
    }

    // Check if business email is unique
    const emailExists = await this.prisma.vendorApplication.findUnique({
      where: { businessEmail: createVendorApplicationDto.businessEmail },
    });

    if (emailExists) {
      throw new ConflictException("Business email already in use");
    }

    // Create vendor application
    return this.prisma.vendorApplication.create({
      data: {
        ...createVendorApplicationDto,
        userId,
      },
    });
  }

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
        orderBy: { createdAt: "desc" },
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
      throw new NotFoundException("Vendor application not found");
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
        throw new ConflictException("Business email already in use");
      }
    }

    // Update application
    return this.prisma.vendorApplication.update({
      where: { id },
      data: updateVendorApplicationDto,
    });
  }

  async approveApplication(id: string) {
    // Check if application exists
    const application = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Vendor application with ID ${id} not found`);
    }

    // Check if application is already approved
    if (application.status === "APPROVED") {
      throw new BadRequestException("Application is already approved");
    }

    // Check if user is already a vendor
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { userId: application.userId },
    });

    if (existingVendor) {
      throw new ConflictException("User is already a vendor");
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
      data: { role: "VENDOR" },
    });

    // Create vendor
    const vendor = await this.prisma.vendor.create({
      data: {
        userId: application.userId,
        businessName: application.businessName,
        businessEmail: application.businessEmail,
        businessPhone: application.businessPhone,
        businessAddress: application.businessAddress,
        businessLogo: application.businessLogo,
        description: application.description,
        slug,
      },
    });

    // Update application status
    await this.prisma.vendorApplication.update({
      where: { id },
      data: {
        status: "APPROVED",
        notes: "Application approved. Vendor account created.",
      },
    });

    return {
      message: "Application approved successfully",
      vendor,
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
    if (application.status === "REJECTED") {
      throw new BadRequestException("Application is already rejected");
    }

    // Update application status
    await this.prisma.vendorApplication.update({
      where: { id },
      data: {
        status: "REJECTED",
        notes: notes || "Application rejected.",
      },
    });

    return {
      message: "Application rejected successfully",
    };
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const { page, limit, search, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {
      isVerified: true,
    };

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || "asc";
    } else {
      orderBy.rating = "desc";
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
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            discountPrice: true,
            images: true,
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
      throw new NotFoundException("Vendor profile not found");
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
        throw new ConflictException("Business email already in use");
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
        throw new ConflictException("Business email already in use");
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
      },
    });
  }
}
