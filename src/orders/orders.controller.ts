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
  @ApiOperation({ summary: "Create a new order" })
  @ApiResponse({ status: 201, description: "Order created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user) {
    return this.ordersService.create(createOrderDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: "Get user orders" })
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
  @ApiResponse({ status: 200, description: "Returns paginated user orders" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
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
