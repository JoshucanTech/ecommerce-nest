import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiOkResponse, ApiBody, ApiHeader } from "@nestjs/swagger"
import { CategoriesService } from "./categories.service"
import  { CreateCategoryDto } from "./dto/create-category.dto"
import  { UpdateCategoryDto } from "./dto/update-category.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { Public } from "../auth/decorators/public.decorator"
import { CurrentUser } from "src/auth/decorators/current-user.decorator"

@ApiTags("categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a new category',
    description: 'Create a new product category. Only administrators can create categories.'
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiBody({
    description: 'Category creation data',
    type: CreateCategoryDto,
    examples: {
      basic: {
        summary: 'Basic category creation',
        value: {
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          image: 'https://example.com/electronics.jpg'
        }
      },
      subcategory: {
        summary: 'Subcategory creation',
        value: {
          name: 'Smartphones',
          description: 'Mobile phones and smartphones',
          image: 'https://example.com/smartphones.jpg',
          parentId: '123e4567-e89b-12d3-a456-426614174000'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Category created successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'Electronics' },
            slug: { type: 'string', example: 'electronics' },
            description: { type: 'string', example: 'Electronic devices and accessories' },
            image: { type: 'string', example: 'https://example.com/electronics.jpg' },
            parentId: { type: 'string', example: null, nullable: true },
            userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
            createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid authentication token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (admin role required)'
  })
  create(@CurrentUser() user, @Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(user.id, createCategoryDto);
  }

  @Get()
  @Public()
  @ApiOperation({ 
    summary: "Get all categories",
    description: "Retrieve all product categories in a hierarchical structure with subcategories and product counts."
  })
  @ApiResponse({ 
    status: 200, 
    description: "Returns all categories",
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
              name: { type: 'string', example: 'Electronics' },
              slug: { type: 'string', example: 'electronics' },
              description: { type: 'string', example: 'Electronic devices and accessories' },
              image: { type: 'string', example: 'https://example.com/electronics.jpg' },
              parentId: { type: 'string', example: null, nullable: true },
              createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
              parent: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
                  name: { type: 'string', example: 'Products' },
                  slug: { type: 'string', example: 'products' }
                }
              },
              subCategories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
                    name: { type: 'string', example: 'Smartphones' },
                    slug: { type: 'string', example: 'smartphones' },
                    image: { type: 'string', example: 'https://example.com/smartphones.jpg' }
                  }
                }
              },
              productCount: { type: 'number', example: 42 }
            }
          }
        }
      }
    }
  })
  findAll() {
    return this.categoriesService.findAll()
  }

  @Get(':id')
  @Public()
  @ApiOperation({ 
    summary: 'Get a category by ID or slug',
    description: 'Retrieve detailed information about a specific category by its ID or slug, including parent category, subcategories, and featured products.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Category ID or slug',
    example: 'electronics' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the category',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'Electronics' },
            slug: { type: 'string', example: 'electronics' },
            description: { type: 'string', example: 'Electronic devices and accessories' },
            image: { type: 'string', example: 'https://example.com/electronics.jpg' },
            parentId: { type: 'string', example: null, nullable: true },
            createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
            parent: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
                name: { type: 'string', example: 'Products' },
                slug: { type: 'string', example: 'products' }
              }
            },
            subCategories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
                  name: { type: 'string', example: 'Smartphones' },
                  slug: { type: 'string', example: 'smartphones' },
                  image: { type: 'string', example: 'https://example.com/smartphones.jpg' }
                }
              }
            },
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174003' },
                  name: { type: 'string', example: 'Smartphone X' },
                  slug: { type: 'string', example: 'smartphone-x' },
                  price: { type: 'number', example: 699.99 },
                  discountPrice: { type: 'number', example: 599.99 },
                  images: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['https://example.com/smartphonex.jpg']
                  }
                }
              }
            },
            productCount: { type: 'number', example: 42 }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: "Update a category",
    description: "Update an existing product category. Only administrators can update categories."
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiParam({ 
    name: "id", 
    description: "Category ID",
    example: "123e4567-e89b-12d3-a456-426614174000"
  })
  @ApiBody({
    description: 'Category update data',
    type: UpdateCategoryDto,
    examples: {
      update: {
        summary: 'Update category details',
        value: {
          name: 'Consumer Electronics',
          description: 'Consumer electronic devices and accessories'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: "Category updated successfully",
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'Consumer Electronics' },
            slug: { type: 'string', example: 'consumer-electronics' },
            description: { type: 'string', example: 'Consumer electronic devices and accessories' },
            image: { type: 'string', example: 'https://example.com/electronics.jpg' },
            parentId: { type: 'string', example: null, nullable: true },
            userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
            createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2023-01-02T00:00:00Z' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: "Bad request - Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized - Missing or invalid authentication token" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions (admin role required)"
  })
  @ApiResponse({ status: 404, description: "Category not found" })
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete a category',
    description: 'Delete a product category. Only administrators can delete categories.'
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Category ID',
    example: "123e4567-e89b-12d3-a456-426614174000"
  })
  @ApiResponse({ status: 200, description: 'Category deleted successfully', content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Category deleted successfully' }
        }
      }
    }
  }})
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid authentication token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions (admin role required)'
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}