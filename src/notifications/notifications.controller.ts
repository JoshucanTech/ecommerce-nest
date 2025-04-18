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
} from "@nestjs/common";
import  { NotificationsService } from "./notifications.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { UpdateNotificationDto } from "./dto/update-notification.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new notification" })
  @ApiResponse({
    status: 201,
    description: "Notification created successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: "Get current user notifications" })
  @ApiResponse({ status: 200, description: "Return user notifications" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "unreadOnly", required: false, type: Boolean })
  findAll(
    @CurrentUser() user,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("unreadOnly") unreadOnly = false,
  ) {
    return this.notificationsService.findUserNotifications(
      user.id,
      +page,
      +limit,
      unreadOnly == true,
    );
  }

  @Get("admin")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get all notifications (admin)" })
  @ApiResponse({ status: 200, description: "Return all notifications" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAllAdmin(@Query("page") page = 1, @Query("limit") limit = 10) {
    return this.notificationsService.findAll(+page, +limit);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get unread notifications count" })
  @ApiResponse({ status: 200, description: "Return unread count" })
  getUnreadCount(@CurrentUser() user) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get notification by ID" })
  @ApiResponse({ status: 200, description: "Return the notification" })
  @ApiResponse({ status: 404, description: "Notification not found" })
  @ApiParam({ name: "id", description: "Notification ID" })
  findOne(@Param("id") id: string, @CurrentUser() user) {
    return this.notificationsService.findOne(id, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update notification" })
  @ApiResponse({
    status: 200,
    description: "Notification updated successfully",
  })
  @ApiResponse({ status: 404, description: "Notification not found" })
  @ApiParam({ name: "id", description: "Notification ID" })
  update(
    @Param("id") id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @CurrentUser() user,
  ) {
    return this.notificationsService.update(id, updateNotificationDto, user.id);
  }

  @Patch("mark-all-read")
  @ApiOperation({ summary: "Mark all notifications as read" })
  @ApiResponse({ status: 200, description: "Notifications marked as read" })
  markAllRead(@CurrentUser() user) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete notification" })
  @ApiResponse({
    status: 200,
    description: "Notification deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Notification not found" })
  @ApiParam({ name: "id", description: "Notification ID" })
  remove(@Param("id") id: string, @CurrentUser() user) {
    return this.notificationsService.remove(id, user.id);
  }
}
