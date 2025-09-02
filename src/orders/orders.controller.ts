import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
} from "@nestjs/swagger";
import  { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { UpdatePaymentStatusDto } from "./dto/update-payment-status.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("orders")
@Controller("orders")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ 
    summary: "Create a new order",
    description: "Create a new order with multiple products from different vendors. The system will automatically split the order by vendor and create separate orders for each vendor."
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiBody({
    description: 'Order creation data',
    type: CreateOrderDto,
    examples: {
      basic: {
        summary: 'Basic order with multiple products',
        value: {
          items: [
            {
              productId: '123e4567-e89b-12d3-a456-426614174000',
              quantity: 2
            },
            {
              productId: '123e4567-e89b-12d3-a456-426614174001',
              variantId: '123e4567-e89b-12d3-a456-426614174002',
              quantity: 1
            }
          ],
          shippingSelections: {
            'vendor-uuid-1': 'shipping-option-uuid-1',
            'vendor-uuid-2': 'shipping-option-uuid-2'
          },
          paymentMethod: 'CREDIT_CARD',
          addressId: '123e4567-e89b-12d3-a456-426614174003',
          couponCode: 'SAVE10',
          notes: 'Please deliver to the back door'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: "Order created successfully",
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            orders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
                  orderNumber: { type: 'string', example: 'ORD-2023-0001' },
                  userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
                  vendorId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
                  status: { type: 'string', example: 'PENDING' },
                  paymentStatus: { type: 'string', example: 'PENDING' },
                  subtotal: { type: 'number', example: 99.99 },
                  shippingCost: { type: 'number', example: 9.99 },
                  tax: { type: 'number', example: 8.00 },
                  total: { type: 'number', example: 117.98 },
                  paymentMethod: { type: 'string', example: 'CREDIT_CARD' },
                  addressId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174003' },
                  couponCode: { type: 'string', example: 'SAVE10' },
                  notes: { type: 'string', example: 'Please deliver to the back door' },
                  createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
                  updatedAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: "Bad request - Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized - Missing or invalid authentication token" })
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user) {
    return this.ordersService.create(createOrderDto, user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: "Get user orders",
    description: "Retrieve a paginated list of orders for the currently authenticated user."
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number for pagination",
    example: 1
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of items per page",
    example: 10
  })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "Filter orders by status (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED)",
    example: "PENDING"
  })
  @ApiResponse({ 
    status: 200, 
    description: "Returns paginated user orders",
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
                  orderNumber: { type: 'string', example: 'ORD-2023-0001' },
                  userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
                  vendorId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
                  status: { type: 'string', example: 'PENDING' },
                  paymentStatus: { type: 'string', example: 'PENDING' },
                  subtotal: { type: 'number', example: 99.99 },
                  shippingCost: { type: 'number', example: 9.99 },
                  tax: { type: 'number', example: 8.00 },
                  total: { type: 'number', example: 117.98 },
                  paymentMethod: { type: 'string', example: 'CREDIT_CARD' },
                  addressId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174003' },
                  couponCode: { type: 'string', example: 'SAVE10' },
                  notes: { type: 'string', example: 'Please deliver to the back door' },
                  createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
                  updatedAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
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
                total: { type: 'number', example: 50 }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: "Unauthorized - Missing or invalid authentication token" })
  findAll(
    @CurrentUser() user,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.ordersService.findAll(user.id, {
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get("admin")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get all orders (admin only)" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "Filter by status",
  })
  @ApiQuery({
    name: "userId",
    required: false,
    type: String,
    description: "Filter by user ID",
  })
  @ApiResponse({ status: 200, description: "Returns paginated orders" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  findAllAdmin(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
    @Query("userId") userId?: string,
  ) {
    return this.ordersService.findAllAdmin({
      page: page || 1,
      limit: limit || 10,
      status,
      userId,
    });
  }

  @Get("vendor")
  @UseGuards(RolesGuard)
  @Roles("VENDOR")
  @ApiOperation({ summary: "Get vendor orders" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "Filter by status",
  })
  @ApiResponse({ status: 200, description: "Returns paginated vendor orders" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  findVendorOrders(
    @CurrentUser() user,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.ordersService.findVendorOrders(user.id, {
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an order by ID" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, description: "Returns the order" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Not the order owner" })
  @ApiResponse({ status: 404, description: "Order not found" })
  findOne(@Param("id") id: string, @CurrentUser() user) {
    return this.ordersService.findOne(id, user);
  }

  @Patch(":id/status")
  @UseGuards(RolesGuard)
  @Roles("ADMIN", "VENDOR")
  @ApiOperation({ summary: "Update order status" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({
    status: 200,
    description: "Order status updated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  updateStatus(
    @Param("id") id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto, user);
  }

  @Patch(":id/payment")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update payment status (admin only)" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({
    status: 200,
    description: "Payment status updated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  updatePaymentStatus(
    @Param("id") id: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(id, updatePaymentStatusDto);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel an order" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 200, description: "Order cancelled successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request - Order cannot be cancelled",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Not the order owner" })
  @ApiResponse({ status: 404, description: "Order not found" })
  cancelOrder(@Param("id") id: string, @CurrentUser() user) {
    return this.ordersService.cancelOrder(id, user);
  }
}
