import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FlashSalesService } from './flash-sales.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('flash-sales')
@Controller('flash-sales')
export class FlashSalesController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new flash sale' })
  @ApiResponse({ status: 201, description: 'Flash sale created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  create(@Body() createFlashSaleDto: CreateFlashSaleDto, @CurrentUser() user) {
    return this.flashSalesService.create(createFlashSaleDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active flash sales with pagination' })
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
    name: 'includeExpired',
    required: false,
    type: Boolean,
    description: 'Include expired flash sales',
  })
  @ApiQuery({
    name: 'vendorId',
    required: false,
    type: String,
    description: 'Filter by vendor ID',
  })
  @ApiResponse({ status: 200, description: 'Returns paginated flash sales' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('includeExpired') includeExpired?: boolean,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.flashSalesService.findAll({
      page: page || 1,
      limit: limit || 10,
      includeExpired: includeExpired === true,
      vendorId,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a flash sale by ID or slug' })
  @ApiParam({ name: 'id', description: 'Flash sale ID or slug' })
  @ApiResponse({ status: 200, description: 'Returns the flash sale' })
  @ApiResponse({ status: 404, description: 'Flash sale not found' })
  findOne(@Param('id') id: string) {
    return this.flashSalesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a flash sale' })
  @ApiParam({ name: 'id', description: 'Flash sale ID' })
  @ApiResponse({ status: 200, description: 'Flash sale updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Flash sale not found' })
  update(
    @Param('id') id: string,
    @Body() updateFlashSaleDto: UpdateFlashSaleDto,
    @CurrentUser() user,
  ) {
    return this.flashSalesService.update(id, updateFlashSaleDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a flash sale' })
  @ApiParam({ name: 'id', description: 'Flash sale ID' })
  @ApiResponse({ status: 200, description: 'Flash sale deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Flash sale not found' })
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.flashSalesService.remove(id, user);
  }
}
