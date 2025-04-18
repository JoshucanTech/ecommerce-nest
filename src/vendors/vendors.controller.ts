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
import  { VendorsService } from "./vendors.service";
import { CreateVendorApplicationDto } from "./dto/create-vendor-application.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { UpdateVendorApplicationDto } from "./dto/update-vendor-application.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("vendors")
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post("apply")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Apply to become a vendor" })
  @ApiResponse({
    status: 201,
    description: "Application submitted successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 409,
    description: "User already has an application or is a vendor",
  })
  apply(
    @Body() createVendorApplicationDto: CreateVendorApplicationDto,
    @CurrentUser() user,
  ) {
    return this.vendorsService.apply(createVendorApplicationDto, user.id);
  }

  @Get("applications")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all vendor applications (admin only)" })
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
    description: "Returns paginated vendor applications",
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
    return this.vendorsService.getApplications({
      page: page || 1,
      limit: limit || 10,
      status,
    });
  }

  @Get("applications/my")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's vendor application" })
  @ApiResponse({
    status: 200,
    description: "Returns the user's vendor application",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Application not found" })
  getMyApplication(@CurrentUser() user) {
    return this.vendorsService.getApplicationByUserId(user.id);
  }

  @Get("applications/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a vendor application by ID (admin only)" })
  @ApiParam({ name: "id", description: "Application ID" })
  @ApiResponse({ status: 200, description: "Returns the vendor application" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Application not found" })
  getApplication(@Param("id") id: string) {
    return this.vendorsService.getApplicationById(id);
  }

  @Patch("applications/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a vendor application (admin only)" })
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
    @Body() updateVendorApplicationDto: UpdateVendorApplicationDto,
  ) {
    return this.vendorsService.updateApplication(
      id,
      updateVendorApplicationDto,
    );
  }

  @Post("applications/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Approve a vendor application (admin only)" })
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
    return this.vendorsService.approveApplication(id);
  }

  @Post("applications/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reject a vendor application (admin only)" })
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
    return this.vendorsService.rejectApplication(id, body.notes);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: "Get all vendors with pagination" })
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
    name: "sortBy",
    required: false,
    type: String,
    description: "Sort field",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    type: String,
    description: "Sort order (asc/desc)",
  })
  @ApiResponse({ status: 200, description: "Returns paginated vendors" })
  findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "asc" | "desc",
  ) {
    return this.vendorsService.findAll({
      page: page || 1,
      limit: limit || 10,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a vendor by ID or slug" })
  @ApiParam({ name: "id", description: "Vendor ID or slug" })
  @ApiResponse({ status: 200, description: "Returns the vendor" })
  @ApiResponse({ status: 404, description: "Vendor not found" })
  findOne(@Param("id") id: string) {
    return this.vendorsService.findOne(id);
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VENDOR")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update vendor profile" })
  @ApiResponse({
    status: 200,
    description: "Vendor profile updated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Vendor not found" })
  updateProfile(@CurrentUser() user, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorsService.updateProfile(user.id, updateVendorDto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a vendor (admin only)" })
  @ApiParam({ name: "id", description: "Vendor ID" })
  @ApiResponse({ status: 200, description: "Vendor updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Vendor not found" })
  update(@Param("id") id: string, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorsService.update(id, updateVendorDto);
  }
}
