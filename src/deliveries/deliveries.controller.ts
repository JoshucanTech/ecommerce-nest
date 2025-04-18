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
import { DeliveriesService } from "./deliveries.service";
import { CreateDeliveryDto } from "./dto/create-delivery.dto";
import { AssignRiderDto } from "./dto/assign-rider.dto";
import { UpdateDeliveryStatusDto } from "./dto/update-delivery-status.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("deliveries")
@Controller("deliveries")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles("ADMIN", "VENDOR")
  @ApiOperation({ summary: "Create a new delivery" })
  @ApiResponse({ status: 201, description: "Delivery created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  create(@Body() createDeliveryDto: CreateDeliveryDto, @CurrentUser() user) {
    return this.deliveriesService.create(createDeliveryDto, user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get all deliveries (admin only)" })
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
  @ApiResponse({ status: 200, description: "Returns paginated deliveries" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.deliveriesService.findAll({
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get("rider")
  @UseGuards(RolesGuard)
  @Roles("RIDER")
  @ApiOperation({ summary: "Get rider deliveries" })
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
  @ApiResponse({
    status: 200,
    description: "Returns paginated rider deliveries",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  findRiderDeliveries(
    @CurrentUser() user,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.deliveriesService.findRiderDeliveries(user.id, {
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get("vendor")
  @UseGuards(RolesGuard)
  @Roles("VENDOR")
  @ApiOperation({ summary: "Get vendor deliveries" })
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
  @ApiResponse({
    status: 200,
    description: "Returns paginated vendor deliveries",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  findVendorDeliveries(
    @CurrentUser() user,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.deliveriesService.findVendorDeliveries(user.id, {
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get("user")
  @ApiOperation({ summary: "Get user deliveries" })
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
  @ApiResponse({
    status: 200,
    description: "Returns paginated user deliveries",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  findUserDeliveries(
    @CurrentUser() user,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.deliveriesService.findUserDeliveries(user.id, {
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a delivery by ID" })
  @ApiParam({ name: "id", description: "Delivery ID" })
  @ApiResponse({ status: 200, description: "Returns the delivery" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not authorized to view this delivery",
  })
  @ApiResponse({ status: 404, description: "Delivery not found" })
  findOne(@Param("id") id: string, @CurrentUser() user) {
    return this.deliveriesService.findOne(id, user);
  }

  @Patch(":id/assign")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Assign a rider to a delivery (admin only)" })
  @ApiParam({ name: "id", description: "Delivery ID" })
  @ApiResponse({ status: 200, description: "Rider assigned successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Delivery not found" })
  assignRider(@Param("id") id: string, @Body() assignRiderDto: AssignRiderDto) {
    return this.deliveriesService.assignRider(id, assignRiderDto);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update delivery status" })
  @ApiParam({ name: "id", description: "Delivery ID" })
  @ApiResponse({
    status: 200,
    description: "Delivery status updated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not authorized to update this delivery",
  })
  @ApiResponse({ status: 404, description: "Delivery not found" })
  updateStatus(
    @Param("id") id: string,
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
