import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { AssignRiderDto } from './dto/assign-rider.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('deliveries')
@Controller('deliveries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'VENDOR', 'SUB_ADMIN')
  @ApiOperation({
    summary: 'Create a new delivery',
    description:
      'Create a new delivery for an order. Only administrators, sub-admins, and vendors can create deliveries.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiBody({
    description: 'Delivery creation data',
    type: CreateDeliveryDto,
    examples: {
      basic: {
        summary: 'Basic delivery creation',
        value: {
          orderId: '123e4567-e89b-12d3-a456-426614174000',
          pickupAddress: '123 Vendor St, New York, NY 10001',
          deliveryAddress: '456 Customer Ave, New York, NY 10002',
          estimatedDeliveryTime: '2023-07-15T14:00:00Z',
          notes: 'Please handle with care',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Delivery created successfully',
  })
  create(@Body() createDeliveryDto: CreateDeliveryDto, @CurrentUser() user) {
    return this.deliveriesService.create(createDeliveryDto, user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUB_ADMIN')
  @ApiOperation({
    summary: 'Get all deliveries (admin and sub-admin only)',
    description:
      'Retrieve a paginated list of all deliveries in the system. Accessible by administrators and sub-admins.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description:
      'Filter deliveries by status (PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED)',
    example: 'PENDING',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated deliveries',
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @CurrentUser() user?: any,
  ) {
    return this.deliveriesService.findAll(
      {
        page: page || 1,
        limit: limit || 10,
        status,
      },
      user,
    );
  }

  @Get('nearby')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  @ApiOperation({ summary: 'Get available deliveries nearby (riders only)' })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  getNearby(
    @CurrentUser() user,
    @Query('radius') radius?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.deliveriesService.findAvailableForRider(user.id, {
      radius,
      page,
      limit,
    });
  }

  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  @ApiOperation({ summary: 'Accept a delivery (riders only)' })
  @ApiParam({ name: 'id', description: 'Delivery ID' })
  accept(@Param('id') id: string, @CurrentUser() user) {
    return this.deliveriesService.acceptDelivery(id, user.id);
  }

  @Get('rider')
  @UseGuards(RolesGuard)
  @Roles('RIDER', 'ADMIN', 'SUB_ADMIN')
  @ApiOperation({ summary: 'Get rider deliveries' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID of the rider (Admin/Sub-Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated rider deliveries',
  })
  findRiderDeliveries(
    @CurrentUser() user,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = (user.role === 'ADMIN' || user.role === 'SUB_ADMIN') && userId ? userId : user.id;
    return this.deliveriesService.findRiderDeliveries(targetUserId, {
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get('vendor')
  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @ApiOperation({ summary: 'Get vendor deliveries' })
  findVendorDeliveries(
    @CurrentUser() user,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.deliveriesService.findVendorDeliveries(user.id, {
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get('user')
  @ApiOperation({ summary: 'Get user deliveries' })
  findUserDeliveries(
    @CurrentUser() user,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.deliveriesService.findUserDeliveries(user.id, {
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a delivery by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.deliveriesService.findOne(id, user);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUB_ADMIN')
  @ApiOperation({ summary: 'Assign a rider to a delivery (admin/sub-admin only)' })
  assignRider(@Param('id') id: string, @Body() assignRiderDto: AssignRiderDto) {
    return this.deliveriesService.assignRider(id, assignRiderDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update delivery status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateDeliveryStatusDto: UpdateDeliveryStatusDto,
    @CurrentUser() user,
  ) {
    return this.deliveriesService.updateStatus(
      id,
      updateDeliveryStatusDto,
      user,
    );
  }
}
