import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductCleanupService } from './product-cleanup.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RecordViewDto } from './dto/recently-viewed.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Session } from '../auth/decorators/session-id.decorator';
import { RedisService } from 'src/redis/redis.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly redisService: RedisService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a new product',
    description: 'Create a new product in the system. Only vendors and administrators can create products.'
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiBody({
    description: 'Product creation data',
    type: CreateProductDto,
    examples: {
      basic: {
        summary: 'Basic product creation',
        value: {
          name: 'Wireless Headphones',
          description: 'High-quality wireless headphones with noise cancellation',
          price: 99.99,
          quantity: 100,
          sku: 'WH-NC100-BLK',
          images: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg'
          ],
          categoryId: '123e4567-e89b-12d3-a456-426614174000'
        }
      },
      withDiscount: {
        summary: 'Product with discount price',
        value: {
          name: 'Smartphone',
          description: 'Latest model smartphone with advanced features',
          price: 699.99,
          discountPrice: 599.99,
          quantity: 50,
          sku: 'SP-LT2023-BLK',
          images: [
            'https://example.com/smartphone1.jpg',
            'https://example.com/smartphone2.jpg'
          ],
          isPublished: true,
          categoryId: '123e4567-e89b-12d3-a456-426614174001'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Product created successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'Wireless Headphones' },
            slug: { type: 'string', example: 'wireless-headphones' },
            description: { type: 'string', example: 'High-quality wireless headphones with noise cancellation' },
            price: { type: 'number', example: 99.99 },
            discountPrice: { type: 'number', example: null, nullable: true },
            sku: { type: 'string', example: 'WH-NC100-BLK' },
            images: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'https://example.com/image1.jpg',
                'https://example.com/image2.jpg'
              ]
            },
            isPublished: { type: 'boolean', example: false },
            categoryId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            vendorId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
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
    description: 'Forbidden - Insufficient permissions (vendor or admin role required)'
  })
  create(@Body() createProductDto: CreateProductDto, @CurrentUser() user) {
    return this.productsService.create(createProductDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ 
    summary: 'Get all products with filtering and pagination',
    description: 'Retrieve a paginated list of products with optional filtering by search term, category, vendor, price range, and sorting options.'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter products by name or description',
    example: 'headphones'
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Category ID or slug to filter products',
    example: 'electronics'
  })
  @ApiQuery({
    name: 'vendor',
    required: false,
    type: String,
    description: 'Vendor ID or slug to filter products',
    example: 'tech-store'
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
    example: 50
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
    example: 200
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Field to sort by (e.g., price, createdAt, name)',
    example: 'price'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc or desc)',
    example: 'asc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns paginated products',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
                  name: { type: 'string', example: 'Wireless Headphones' },
                  slug: { type: 'string', example: 'wireless-headphones' },
                  description: { type: 'string', example: 'High-quality wireless headphones with noise cancellation' },
                  price: { type: 'number', example: 99.99 },
                  discountPrice: { type: 'number', example: null, nullable: true },
                  sku: { type: 'string', example: 'WH-NC100-BLK' },
                  images: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                      'https://example.com/image1.jpg',
                      'https://example.com/image2.jpg'
                    ]
                  },
                  isPublished: { type: 'boolean', example: true },
                  categoryId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
                  vendorId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
                  createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
                  updatedAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
                  category: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
                      name: { type: 'string', example: 'Electronics' },
                      slug: { type: 'string', example: 'electronics' }
                    }
                  },
                  vendor: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
                      businessName: { type: 'string', example: 'Tech Store' },
                      slug: { type: 'string', example: 'tech-store' }
                    }
                  }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                total: { type: 'number', example: 100 }
              }
            }
          }
        }
      }
    }
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('vendor') vendor?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.productsService.findAll({
      page: page || 1,
      limit: limit || 10,
      search,
      category,
      vendor,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
    });
  }

  @Get('/new')
  @Public()
  @ApiOperation({ 
    summary: 'Get new products',
    description: 'Retrieve a list of newly added products, sorted by creation date.'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items to retrieve',
    example: 10
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns new products',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
                  name: { type: 'string', example: 'Wireless Headphones' },
                  slug: { type: 'string', example: 'wireless-headphones' },
                  description: { type: 'string', example: 'High-quality wireless headphones with noise cancellation' },
                  price: { type: 'number', example: 99.99 },
                  discountPrice: { type: 'number', example: null, nullable: true },
                  sku: { type: 'string', example: 'WH-NC100-BLK' },
                  images: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                      'https://example.com/image1.jpg',
                      'https://example.com/image2.jpg'
                    ]
                  },
                  isPublished: { type: 'boolean', example: true },
                  categoryId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
                  vendorId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
                  createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
                  updatedAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                total: { type: 'number', example: 50 }
              }
            }
          }
        }
      }
    }
  })
  getNewProducts(@Query('limit') limit = 10, @Query('page') page = 1) {
    return this.productsService.getNewProducts(limit, page);
  }

  @Get('recently-viewed')
  @Public()
  @ApiOperation({ summary: 'Get recently viewed products' })
  @ApiCookieAuth() // Indicates use of cookies like `session_id`
  @ApiResponse({
    status: 200,
    description: 'List of recently viewed products returned successfully',
    // type: [ProductDto], // Replace with the actual DTO type returned
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getViewed(@Req() req) {
    const userId = req.user?.id;
    // const sessionId = req.cookies['session_id']; // or generate if missing
    const sessionId = 'sessionId-12345'; // or generate if missing
    return this.productsService.getRecentlyViewed(userId, sessionId);
  }

  @Post('recently-viewed')
  @Session()
  @ApiOperation({ summary: 'Record product view for recently viewed list' })
  @ApiResponse({ status: 201, description: 'Product view recorded' })
  @ApiResponse({
    status: 400,
    description: 'Missing productId or session/user ID',
  })
  async recordRecentlyView(
    @Body()
    { productId, userId, sessionId }: RecordViewDto,
    @CurrentUser() user,
    @Req() req,
  ) {
    userId = user?.id;
    sessionId = req?.headers['x-anonymous-id']?.toString();
    return this.productsService.recordView({ productId, userId, sessionId });
  }

  // For viewer count
  @Get(':id/viewers')
  @Public()
  getViewerCount(@Param('id') productId: string) {
    return this.redisService.getViewerCount(productId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a product by ID or slug' })
  @ApiParam({ name: 'id', description: 'Product ID or slug' })
  @ApiResponse({ status: 200, description: 'Returns the product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user,
  ) {
    return this.productsService.update(id, updateProductDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.productsService.remove(id, user);
  }

  @Post(':id/viewers')
  // @UseGuards(OptionalJwtGuard)
  @Session()
  addViewer(@Param('id') productId: string, @CurrentUser() user, @Req() req) {
    const userId = req.user?.id || req.headers['x-anonymous-id']?.toString();
    // console.log('The user id for post addViewer is now aaa: ', req);
    console.log('user: ', user);
    // console.log('req: ', req);
    console.log('req.headers x-anonymous-id: ', req.headers['x-anonymous-id']);

    if (!userId) {
      throw new BadRequestException('User ID or anonymous ID is required');
    }
    return this.redisService.addViewer(productId, userId);
  }

  @Delete(':id/viewers')
  // @Session()
  removeViewer(
    @Param('id') productId: string,
    @CurrentUser() user,
    @Req() req,
  ) {
    const userId = user?.id || req?.headers['x-anonymous-id']?.toString();
    // console.log('The user id for post addViewer is now: ', req);

    if (!userId) {
      throw new BadRequestException('User ID or anonymous ID is required');
    }
    return this.redisService.removeViewer(productId, userId);
  }

  @Get(':id/frequently-bought-together')
  @Public()
  @ApiOperation({ summary: 'Get frequently bought together products' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns frequently bought together products',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getFrequentlyBoughtTogether(@Param('id') id: string) {
    return this.productsService.getFrequentlyBoughtTogether(id);
  }
}
