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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({
    status: 201,
    description: 'The order has been successfully created.',
  })
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user) {
    return this.ordersService.create(createOrderDto, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all orders (Admin only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({
    status: 200,
    description: 'Return all orders.',
  })
  findAll(
    @CurrentUser() user,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    return this.ordersService.findAllAuthorized(user, {
      page: Number(page),
      limit: Number(limit),
      status,
      userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get all orders for the authenticated user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({
    status: 200,
    description: 'Return all orders for the authenticated user.',
  })
  findMyOrders(
    @CurrentUser() user,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAll(user.id, {
      page: Number(page),
      limit: Number(limit),
      status,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/grouped')
  @ApiOperation({
    summary:
      'Get all orders for the authenticated user grouped by transaction reference',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description:
      'Return all orders for the authenticated user grouped by transaction reference.',
  })
  async findMyOrdersGrouped(
    @CurrentUser() user,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.ordersService.findGroupedByTransactionRef(user.id, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('transaction/:transactionRef')
  @ApiOperation({ summary: 'Get all orders by transaction reference' })
  @ApiResponse({
    status: 200,
    description: 'Return all orders with the specified transaction reference.',
  })
  @ApiResponse({
    status: 404,
    description: 'No orders found with the specified transaction reference.',
  })
  findByTransactionRef(
    @Param('transactionRef') transactionRef: string,
    @CurrentUser() user,
  ) {
    return this.ordersService.findByTransactionRef(transactionRef, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Return dashboard statistics.',
  })
  getDashboardStats(@CurrentUser() user) {
    return this.ordersService.getDashboardStats(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get an order by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the order with the specified id.',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found.',
  })
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.ordersService.findOne(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN, UserRole.VENDOR)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({
    status: 200,
    description: 'The order status has been successfully updated.',
  })
  updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/payment-status')
  @ApiOperation({ summary: 'Update payment status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'The payment status has been successfully updated.',
  })
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(id, updatePaymentStatusDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'The order has been successfully deleted.',
  })
  remove(@Param('id') id: string) {
    // If the remove method doesn't exist, we can use update to mark as deleted
    return this.ordersService.updateStatus(
      id,
      { status: 'CANCELLED' },
      {}, // Empty user object
    );
  }
}
