import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateSlug } from '../utils/slug-generator';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createCategoryDto: CreateCategoryDto) {
    // Check if parent category exists if parentId is provided
    if (createCategoryDto.parentId) {
      const parentCategory = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });

      if (!parentCategory) {
        throw new BadRequestException(
          `Parent category with ID ${createCategoryDto.parentId} not found`,
        );
      }
    }

    // Generate slug from category name
    const slug = await generateSlug(createCategoryDto.name, async (slug) => {
      const exists = await this.prisma.category.findUnique({
        where: { slug },
      });
      return !exists;
    });

    // Create category
    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        slug,
        userId,
      },
    });
  }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        subCategories: {
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return categories.map((category) => ({
      ...category,
      productCount: category._count.products,
      _count: undefined,
    }));
  }

  async findOne(idOrSlug: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        subCategories: {
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
          },
        },
        products: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
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

    if (!category) {
      throw new NotFoundException(
        `Category with ID or slug ${idOrSlug} not found`,
      );
    }

    return {
      ...category,
      productCount: category._count.products,
      _count: undefined,
    };
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if parent category exists if parentId is provided
    if (updateCategoryDto.parentId) {
      // Prevent circular reference
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      const parentCategory = await this.prisma.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });

      if (!parentCategory) {
        throw new BadRequestException(
          `Parent category with ID ${updateCategoryDto.parentId} not found`,
        );
      }
    }

    // Update slug if name is changed
    let slug = category.slug;
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      slug = await generateSlug(updateCategoryDto.name, async (newSlug) => {
        const exists = await this.prisma.category.findFirst({
          where: {
            slug: newSlug,
            id: { not: id },
          },
        });
        return !exists;
      });
    }

    // Update category
    return this.prisma.category.update({
      where: { id },
      data: {
        ...updateCategoryDto,
        slug,
      },
    });
  }

  async remove(id: string) {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: true,
        products: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has subcategories
    if (category.subCategories.length > 0) {
      throw new BadRequestException(
        'Cannot delete a category with subcategories',
      );
    }

    // Check if category has products
    if (category.products.length > 0) {
      throw new BadRequestException('Cannot delete a category with products');
    }

    // Delete category
    await this.prisma.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }
}
