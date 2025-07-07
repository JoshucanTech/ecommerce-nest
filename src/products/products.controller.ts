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
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductCleanupService } from './product-cleanup.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Session } from '../auth/decorators/session-id.decorator';
import { RedisService } from 'src/real-time/redis.service';

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
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  create(@Body() createProductDto: CreateProductDto, @CurrentUser() user) {
    return this.productsService.create(createProductDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all products with filtering and pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Category ID or slug',
  })
  @ApiQuery({
    name: 'vendor',
    required: false,
    type: String,
    description: 'Vendor ID or slug',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (asc/desc)',
  })
  @ApiResponse({ status: 200, description: 'Returns paginated products' })
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
  @ApiOperation({ summary: 'Get new products' })
  @ApiResponse({ status: 200, description: 'Returns new products' })
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

  // For viewer count
  @Get(':id/viewers')
  @Public()
  getViewerCount(@Param('id') productId: string) {
    return this.redisService.getViewerCount(productId);
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
    const userId = user?.id || req.headers['x-anonymous-id']?.toString();
    console.log('The user id for post addViewer is now: ', req);

    if (!userId) {
      throw new BadRequestException('User ID or anonymous ID is required');
    }
    return this.redisService.removeViewer(productId, userId);
  }
}
