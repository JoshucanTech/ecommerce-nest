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
import  { RidersService } from "./riders.service";
import { CreateRiderApplicationDto } from "./dto/create-rider-application.dto";
import { UpdateRiderDto } from "./dto/update-rider.dto";
import { UpdateRiderApplicationDto } from "./dto/update-rider-application.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("riders")
@Controller("riders")
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Post("apply")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Apply to become a rider" })
  @ApiResponse({
    status: 201,
    description: "Application submitted successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 409,
    description: "User already has an application or is a rider",
  })
  apply(
    @Body() createRiderApplicationDto: CreateRiderApplicationDto,
    @CurrentUser() user,
  ) {
    return this.ridersService.apply(createRiderApplicationDto, user.id);
  }

  @Get("applications")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all rider applications (admin only)" })
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
    description: "Returns paginated rider applications",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  getApplications(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.ridersService.getApplications({
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get("applications/my")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's rider application" })
  @ApiResponse({
    status: 200,
    description: "Returns the user's rider application",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Application not found" })
  getMyApplication(@CurrentUser() user) {
    return this.ridersService.getApplicationByUserId(user.id);
  }

  @Get("applications/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a rider application by ID (admin only)" })
  @ApiParam({ name: "id", description: "Application ID" })
  @ApiResponse({ status: 200, description: "Returns the rider application" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Application not found" })
  getApplication(@Param("id") id: string) {
    return this.ridersService.getApplicationById(id);
  }

  @Patch("applications/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a rider application (admin only)" })
  @ApiParam({ name: "id", description: "Application ID" })
  @ApiResponse({ status: 200, description: "Application updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Application not found" })
  updateApplication(
    @Param("id") id: string,
    @Body() updateRiderApplicationDto: UpdateRiderApplicationDto,
  ) {
    return this.ridersService.updateApplication(id, updateRiderApplicationDto);
  }

  @Post("applications/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Approve a rider application (admin only)" })
  @ApiParam({ name: "id", description: "Application ID" })
  @ApiResponse({
    status: 200,
    description: "Application approved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Application not found" })
  approveApplication(@Param("id") id: string) {
    return this.ridersService.approveApplication(id);
  }

  @Post("applications/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reject a rider application (admin only)" })
  @ApiParam({ name: "id", description: "Application ID" })
  @ApiResponse({
    status: 200,
    description: "Application rejected successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Application not found" })
  rejectApplication(@Param("id") id: string, @Body() body: { notes?: string }) {
    return this.ridersService.rejectApplication(id, body.notes);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all riders with pagination (admin only)" })
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
    name: "search",
    required: false,
    type: String,
    description: "Search term",
  })
  @ApiQuery({
    name: "isAvailable",
    required: false,
    type: Boolean,
    description: "Filter by availability",
  })
  @ApiResponse({ status: 200, description: "Returns paginated riders" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("isAvailable") isAvailable?: boolean,
  ) {
    return this.ridersService.findAll({
      page: page || 1,
      limit: limit || 10,
      search,
      isAvailable,
    });
  }

  @Get("available")
  @Public()
  @ApiOperation({ summary: "Get available riders for delivery" })
  @ApiQuery({
    name: "latitude",
    required: true,
    type: Number,
    description: "Delivery location latitude",
  })
  @ApiQuery({
    name: "longitude",
    required: true,
    type: Number,
    description: "Delivery location longitude",
  })
  @ApiQuery({
    name: "radius",
    required: false,
    type: Number,
    description: "Search radius in kilometers",
  })
  @ApiResponse({
    status: 200,
    description: "Returns available riders near the location",
  })
  findAvailable(
    @Query("latitude") latitude: number,
    @Query("longitude") longitude: number,
    @Query("radius") radius?: number,
  ) {
    return this.ridersService.findAvailable(latitude, longitude, radius || 5);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a rider by ID" })
  @ApiParam({ name: "id", description: "Rider ID" })
  @ApiResponse({ status: 200, description: "Returns the rider" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Rider not found" })
  findOne(@Param("id") id: string) {
    return this.ridersService.findOne(id);
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("RIDER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update rider profile" })
  @ApiResponse({
    status: 200,
    description: "Rider profile updated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Rider not found" })
  updateProfile(@CurrentUser() user, @Body() updateRiderDto: UpdateRiderDto) {
    return this.ridersService.updateProfile(user.id, updateRiderDto);
  }

  @Patch("location")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("RIDER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update rider location" })
  @ApiResponse({ status: 200, description: "Location updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Rider not found" })
  updateLocation(
    @CurrentUser() user,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.ridersService.updateLocation(user.id, updateLocationDto);
  }

  @Patch("availability")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("RIDER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Toggle rider availability" })
  @ApiResponse({
    status: 200,
    description: "Availability updated successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Rider not found" })
  toggleAvailability(
    @CurrentUser() user,
    @Body() body: { isAvailable: boolean },
  ) {
    return this.ridersService.toggleAvailability(user.id, body.isAvailable);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a rider (admin only)" })
  @ApiParam({ name: "id", description: "Rider ID" })
  @ApiResponse({ status: 200, description: "Rider updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Rider not found" })
  update(@Param("id") id: string, @Body() updateRiderDto: UpdateRiderDto) {
    return this.ridersService.update(id, updateRiderDto);
  }
}
