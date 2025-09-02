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
  @ApiOperation({ 
    summary: "Create a new delivery",
    description: "Create a new delivery for an order. Only administrators and vendors can create deliveries."
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
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
          notes: 'Please handle with care'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: "Delivery created successfully",
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            orderId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
            riderId: { type: 'string', example: null, nullable: true },
            pickupAddress: { type: 'string', example: '123 Vendor St, New York, NY 10001' },
            deliveryAddress: { type: 'string', example: '456 Customer Ave, New York, NY 10002' },
            status: { type: 'string', example: 'PENDING' },
            estimatedDeliveryTime: { type: 'string', format: 'date-time', example: '2023-07-15T14:00:00Z' },
            actualDeliveryTime: { type: 'string', format: 'date-time', example: null, nullable: true },
            notes: { type: 'string', example: 'Please handle with care' },
            createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: "Bad request - Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized - Missing or invalid authentication token" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions (admin or vendor role required)"
  })
  create(@Body() createDeliveryDto: CreateDeliveryDto, @CurrentUser() user) {
    return this.deliveriesService.create(createDeliveryDto, user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ 
    summary: "Get all deliveries (admin only)",
    description: "Retrieve a paginated list of all deliveries in the system. Only accessible by administrators."
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
    description: "Filter deliveries by status (PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED)",
    example: "PENDING"
  })
  @ApiResponse({ 
    status: 200, 
    description: "Returns paginated deliveries",
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
                  orderId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
                  riderId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002', nullable: true },
                  pickupAddress: { type: 'string', example: '123 Vendor St, New York, NY 10001' },
                  deliveryAddress: { type: 'string', example: '456 Customer Ave, New York, NY 10002' },
                  status: { type: 'string', example: 'PENDING' },
                  estimatedDeliveryTime: { type: 'string', format: 'date-time', example: '2023-07-15T14:00:00Z' },
                  actualDeliveryTime: { type: 'string', format: 'date-time', example: null, nullable: true },
                  notes: { type: 'string', example: 'Please handle with care' },
                  createdAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
                  updatedAt: { type: 'string', format: 'date-time', example: '2023-01-01T00:00:00Z' },
                  order: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
                      orderNumber: { type: 'string', example: 'ORD-2023-0001' }
                    }
                  },
                  rider: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
                      user: {
                        type: 'object',
                        properties: {
                          firstName: { type: 'string', example: 'John' },
                          lastName: { type: 'string', example: 'Doe' }
                        }
                      }
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
  @ApiResponse({ status: 401, description: "Unauthorized - Missing or invalid authentication token" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions (admin role required)"
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
