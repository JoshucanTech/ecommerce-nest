import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { generateSlug } from "../utils/slug-generator";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto, userId: string) {
    // Get vendor ID from user
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new ForbiddenException("User is not a vendor");
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
    sortOrder?: "asc" | "desc";
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
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = {
        OR: [{ id: category }, { slug: category }],
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
      orderBy[sortBy] = sortOrder || "asc";
    } else {
      orderBy.createdAt = "desc";
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
      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
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

  async findOne(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            // rating: true,
            // totalRatings: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                // firstName: true,
                // lastName: true,
                avatar: true,
              },
            },
          },
        },
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

    // Calculate average rating
    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
          product.reviews.length
        : 0;

    // Check if product is in an active flash sale
    const activeFlashSale = product.flashSaleItems.find(
      (item) => item.flashSale !== null,
    );
    const flashSalePrice = activeFlashSale
      ? product.price * (1 - activeFlashSale.discountPercentage / 100)
      : null;

    return {
      ...product,
      avgRating,
      reviewCount: product.reviews.length,
      flashSalePrice,
      activeFlashSale: activeFlashSale
        ? {
            id: activeFlashSale.flashSaleId,
            name: activeFlashSale.flashSale.name,
            discountPercentage: activeFlashSale.discountPercentage,
            endDate: activeFlashSale.flashSale.endDate,
          }
        : null,
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
    if (user.role !== "ADMIN" && product.vendor.userId !== user.id) {
      throw new ForbiddenException(
        "You do not have permission to update this product",
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
    if (user.role !== "ADMIN" && product.vendor.userId !== user.id) {
      throw new ForbiddenException(
        "You do not have permission to delete this product",
      );
    }

    // Delete product
    await this.prisma.product.delete({
      where: { id },
    });

    return { message: "Product deleted successfully" };
  }
}
