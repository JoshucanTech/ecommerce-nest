// backend/src/payments/payments.controller.ts
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
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreatePaymentIntentDto } from "./dto/create-payment-intent.dto";
import {
  CreateOrderPaymentDto,
  CreateRiderPaymentDto,
  CreateFeaturePaymentDto,
  CreatePaymentDto,
} from "./dto/create-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";

@ApiTags("payments")
@Controller("payments")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BUYER)
  @ApiOperation({ summary: "Create a new payment" })
  @ApiResponse({ status: 201, description: "Payment created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user,
  ) {
    return this.paymentsService.create(createPaymentDto, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get all payments" })
  @ApiResponse({ status: 200, description: "Return all payments" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAll(@Query("page") page = 1, @Query("limit") limit = 10) {
    return this.paymentsService.findAll(+page, +limit);
  }

  @Get("user")
  @Roles(UserRole.BUYER)
  @ApiOperation({ summary: "Get current user payments" })
  @ApiResponse({ status: 200, description: "Return user payments" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findUserPayments(
    @CurrentUser() user,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.paymentsService.findUserPayments(user.id, +page, +limit);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.BUYER)
  @ApiOperation({ summary: "Get payment by ID" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiResponse({ status: 200, description: "Return the payment" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  findOne(@Param("id") id: string, @CurrentUser() user) {
    return this.paymentsService.findOne(id, user);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update payment" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiResponse({ status: 200, description: "Payment updated successfully" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  update(@Param("id") id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Delete payment" })
  @ApiResponse({ status: 200, description: "Payment deleted successfully" })
  @ApiResponse({ status: 404, description: "Payment not found" })
  @ApiParam({ name: "id", description: "Payment ID" })
  remove(@Param("id") id: string) {
    return this.paymentsService.remove(id);
  }

  // Webhook endpoint for payment provider callbacks
  @Post("webhook")
  @ApiOperation({ summary: "Payment provider webhook" })
  @ApiResponse({ status: 200, description: "Webhook processed" })
  processWebhook(@Body() webhookData: any) {
    return this.paymentsService.processWebhook(webhookData);
  }
}
