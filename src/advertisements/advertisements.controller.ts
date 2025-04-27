import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from "@nestjs/swagger"
import { AdvertisementsService } from "./advertisements.service"
import { CreateAdvertisementDto } from "./dto/create-advertisement.dto"
import { UpdateAdvertisementDto } from "./dto/update-advertisement.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { CurrentUser } from "../auth/decorators/current-user.decorator"
import { AdStatus } from "@prisma/client"

@ApiTags("advertisements")
@Controller("advertisements")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdvertisementsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  @Post()
  @Roles("VENDOR", "ADMIN")
  @ApiOperation({ summary: "Create a new advertisement" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The advertisement has been successfully created.",
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Bad Request." })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized." })
  create(@Body() createAdvertisementDto: CreateAdvertisementDto, @CurrentUser() user) {
    return this.advertisementsService.create(createAdvertisementDto, user)
  }

  @Get()
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get all advertisements' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return all advertisements.",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: AdStatus })
  @ApiQuery({ name: "vendorId", required: false })
  findAll(
    @CurrentUser() user,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: AdStatus,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.advertisementsService.findAll({
      page: +page,
      limit: +limit,
      status,
      vendorId,
      user,
    })
  }

  @Get(":id")
  @Roles("VENDOR", "ADMIN")
  @ApiOperation({ summary: "Get advertisement by ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return the advertisement.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Advertisement not found." })
  @ApiParam({ name: "id", description: "Advertisement ID" })
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.advertisementsService.findOne(id, user)
  }

  @Patch(":id")
  @Roles("VENDOR", "ADMIN")
  @ApiOperation({ summary: "Update advertisement" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The advertisement has been successfully updated.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Advertisement not found." })
  @ApiParam({ name: "id", description: "Advertisement ID" })
  update(@Param('id') id: string, @Body() updateAdvertisementDto: UpdateAdvertisementDto, @CurrentUser() user) {
    return this.advertisementsService.update(id, updateAdvertisementDto, user)
  }

  @Delete(":id")
  @Roles("VENDOR", "ADMIN")
  @ApiOperation({ summary: "Delete advertisement" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The advertisement has been successfully deleted.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Advertisement not found." })
  @ApiParam({ name: "id", description: "Advertisement ID" })
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.advertisementsService.remove(id, user)
  }

  @Post(":id/submit")
  @Roles("VENDOR")
  @ApiOperation({ summary: "Submit advertisement for approval" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The advertisement has been successfully submitted for approval.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Advertisement not found." })
  @ApiParam({ name: "id", description: "Advertisement ID" })
  submit(@Param('id') id: string, @CurrentUser() user) {
    return this.advertisementsService.updateStatus(id, AdStatus.PENDING_APPROVAL, user)
  }

  @Post(":id/approve")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Approve advertisement" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The advertisement has been successfully approved.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Advertisement not found." })
  @ApiParam({ name: "id", description: "Advertisement ID" })
  approve(@Param('id') id: string, @CurrentUser() user) {
    return this.advertisementsService.updateStatus(id, AdStatus.ACTIVE, user)
  }

  @Post(":id/reject")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Reject advertisement" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The advertisement has been successfully rejected.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Advertisement not found." })
  @ApiParam({ name: "id", description: "Advertisement ID" })
  reject(@Param('id') id: string, @Body('notes') notes: string, @CurrentUser() user) {
    return this.advertisementsService.rejectAdvertisement(id, notes, user)
  }

  @Post(":id/pause")
  @Roles("VENDOR", "ADMIN")
  @ApiOperation({ summary: "Pause advertisement" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The advertisement has been successfully paused.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Advertisement not found." })
  @ApiParam({ name: "id", description: "Advertisement ID" })
  pause(@Param('id') id: string, @CurrentUser() user) {
    return this.advertisementsService.updateStatus(id, AdStatus.PAUSED, user)
  }

  @Post(":id/resume")
  @Roles("VENDOR", "ADMIN")
  @ApiOperation({ summary: "Resume advertisement" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The advertisement has been successfully resumed.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Advertisement not found." })
  @ApiParam({ name: "id", description: "Advertisement ID" })
  resume(@Param('id') id: string, @CurrentUser() user) {
    return this.advertisementsService.updateStatus(id, AdStatus.ACTIVE, user)
  }

  @Post(":id/archive")
  @Roles("VENDOR", "ADMIN")
  @ApiOperation({ summary: "Archive advertisement" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The advertisement has been successfully archived.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Advertisement not found." })
  @ApiParam({ name: "id", description: "Advertisement ID" })
  archive(@Param('id') id: string, @CurrentUser() user) {
    return this.advertisementsService.updateStatus(id, AdStatus.ARCHIVED, user)
  }
}
