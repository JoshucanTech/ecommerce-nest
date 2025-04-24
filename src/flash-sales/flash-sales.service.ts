import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import  { PrismaService } from "../prisma/prisma.service";
import { CreateFlashSaleDto } from "./dto/create-flash-sale.dto";
import { UpdateFlashSaleDto } from "./dto/update-flash-sale.dto";
import { generateSlug } from "../utils/slug-generator";

@Injectable()
export class FlashSalesService {
  constructor(private prisma: PrismaService) {}

  async create(createFlashSaleDto: CreateFlashSaleDto, userId: string) {
    const { name, description, startDate, endDate, isActive, items } =
      createFlashSaleDto;

    // Get vendor ID from user
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new ForbiddenException("User is not a vendor");
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new BadRequestException("End date must be after start date");
    }

    if (start < new Date() && !isActive) {
      throw new BadRequestException(
        "Cannot create an inactive flash sale with a past start date",
      );
    }

    // Generate slug from flash sale name
    const slug = await generateSlug(name, async (slug) => {
      const exists = await this.prisma.flashSale.findUnique({
        where: { slug },
      });
      return !exists;
    });

    // Validate products
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        vendorId: vendor.id,
      },
      include: {
        inventory: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        "Some products do not exist or do not belong to this vendor",
      );
    }

    // Check inventory
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product.inventory || product.inventory.quantity < item.quantity) {
        throw new BadRequestException(
          `Product ${product.name} has insufficient inventory`,
        );
      }
    }

    // Create flash sale with items
    return this.prisma.flashSale.create({
      data: {
        name,
        description,
        startDate: start,
        endDate: end,
        isActive: isActive ?? true,
        slug,
        vendorId: vendor.id,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            discountPercentage: item.discountPercentage,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: true,
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    includeExpired: boolean;
    vendorId?: string;
  }) {
    const { page, limit, includeExpired, vendorId } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (!includeExpired) {
      where.endDate = { gte: new Date() };
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    // Get flash sales with pagination
    const [flashSales, total] = await Promise.all([
      this.prisma.flashSale.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
            },
            
          },
          items: {
            include: {
              product: true, // Include product data here
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      this.prisma.flashSale.count({ where }),
    ]);

    // Process flash sales
    const processedFlashSales = flashSales.map((flashSale) => {
      const now = new Date();
      const isActive =
        flashSale.isActive &&
        flashSale.startDate <= now &&
        flashSale.endDate >= now;

      return {
        ...flashSale,
        itemCount: flashSale._count.items,
        status: isActive
          ? "ACTIVE"
          : flashSale.startDate > now
            ? "UPCOMING"
            : "EXPIRED",
        _count: undefined,
      };
    });

    return {
      data: processedFlashSales,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrSlug: string) {
    const flashSale = await this.prisma.flashSale.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                discountPrice: true,
                images: true,
                inventory: {
                  select: {
                    quantity: true,
                  },
                },
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
      },
    });

    if (!flashSale) {
      throw new NotFoundException(
        `Flash sale with ID or slug ${idOrSlug} not found`,
      );
    }

    // Process items to include discounted price
    const items = flashSale.items.map((item) => {
      const basePrice = item.product.discountPrice || item.product.price;
      const discountedPrice = basePrice * (1 - item.discountPercentage / 100);

      return {
        ...item,
        product: {
          ...item.product,
          discountedPrice,
          savings: basePrice - discountedPrice,
          savingsPercentage: item.discountPercentage,
          availableQuantity: Math.min(
            item.quantity - item.soldCount,
            item.product.inventory?.quantity || 0,
          ),
        },
      };
    });

    // Determine status
    const now = new Date();
    const status =
      flashSale.isActive &&
      flashSale.startDate <= now &&
      flashSale.endDate >= now
        ? "ACTIVE"
        : flashSale.startDate > now
          ? "UPCOMING"
          : "EXPIRED";

    return {
      ...flashSale,
      items,
      status,
    };
  }

  async update(id: string, updateFlashSaleDto: UpdateFlashSaleDto, user: any) {
    // Check if flash sale exists
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: true,
      },
    });

    if (!flashSale) {
      throw new NotFoundException(`Flash sale with ID ${id} not found`);
    }

    // Check if user is the vendor of the flash sale or an admin
    if (user.role !== "ADMIN" && flashSale.vendor.userId !== user.id) {
      throw new ForbiddenException(
        "You do not have permission to update this flash sale",
      );
    }

    // Extract data from DTO
    const { name, description, startDate, endDate, isActive, items } =
      updateFlashSaleDto;

    // Update slug if name is changed
    let slug = flashSale.slug;
    if (name && name !== flashSale.name) {
      slug = await generateSlug(name, async (newSlug) => {
        const exists = await this.prisma.flashSale.findFirst({
          where: {
            slug: newSlug,
            id: { not: id },
          },
        });
        return !exists;
      });
    }

    // Validate dates if provided
    let start = flashSale.startDate;
    let end = flashSale.endDate;

    if (startDate) {
      start = new Date(startDate);
    }

    if (endDate) {
      end = new Date(endDate);
    }

    if (start >= end) {
      throw new BadRequestException("End date must be after start date");
    }

    // Prepare update data
    const updateData: any = {
      name,
      description,
      startDate: start,
      endDate: end,
      isActive,
      slug,
    };

    // Handle items update if provided
    if (items) {
      // Validate products
      const productIds = items.map((item) => item.productId);
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          vendorId: flashSale.vendorId,
        },
        include: {
          inventory: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException(
          "Some products do not exist or do not belong to this vendor",
        );
      }

      // Check inventory
      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product.inventory || product.inventory.quantity < item.quantity) {
          throw new BadRequestException(
            `Product ${product.name} has insufficient inventory`,
          );
        }
      }

      // Delete existing items
      await this.prisma.flashSaleItem.deleteMany({
        where: { flashSaleId: id },
      });

      // Create new items
      await this.prisma.flashSaleItem.createMany({
        data: items.map((item) => ({
          flashSaleId: id,
          productId: item.productId,
          discountPercentage: item.discountPercentage,
          quantity: item.quantity,
        })),
      });
    }

    // Update flash sale
    return this.prisma.flashSale.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                discountPrice: true,
                images: true,
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
      },
    });
  }

  async remove(id: string, user: any) {
    // Check if flash sale exists
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!flashSale) {
      throw new NotFoundException(`Flash sale with ID ${id} not found`);
    }

    // Check if user is the vendor of the flash sale or an admin
    if (user.role !== "ADMIN" && flashSale.vendor.userId !== user.id) {
      throw new ForbiddenException(
        "You do not have permission to delete this flash sale",
      );
    }

    // Delete flash sale
    await this.prisma.flashSale.delete({
      where: { id },
    });

    return { message: "Flash sale deleted successfully" };
  }
}
