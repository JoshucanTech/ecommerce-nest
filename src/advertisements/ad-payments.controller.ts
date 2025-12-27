import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdPaymentsService } from './ad-payments.service';
import { CreateAdPaymentDto } from './dto/create-ad-payment.dto';
import { UpdateAdPaymentDto } from './dto/update-ad-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentStatus } from '@prisma/client';

@ApiTags('ad-payments')
@Controller('ad-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdPaymentsController {
  constructor(private readonly adPaymentsService: AdPaymentsService) {}

  @Post()
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Create a new ad payment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The ad payment has been successfully created.',
  })
  create(@Body() createAdPaymentDto: CreateAdPaymentDto, @CurrentUser() user) {
    return this.adPaymentsService.create(createAdPaymentDto);
  }

  @Get()
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get all ad payments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return all ad payments.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatus })
  @ApiQuery({ name: 'advertisementId', required: false })
  findAll(
    @Param('vendorId') vendorId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: PaymentStatus,
    @Query('advertisementId') advertisementId?: string,
    // @CurrentUser() user,
  ) {
    return this.adPaymentsService.findAll(
      vendorId,
      // +page
      // +limit,
      // status,
      // advertisementId,
      // user,
    );
  }

  @Get(':id')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get ad payment by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return the ad payment.',
  })
  @ApiParam({ name: 'id', description: 'Ad Payment ID' })
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.adPaymentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update ad payment' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The ad payment has been successfully updated.',
  })
  @ApiParam({ name: 'id', description: 'Ad Payment ID' })
  update(
    @Param('id') id: string,
    @Body() updateAdPaymentDto: UpdateAdPaymentDto,
    @CurrentUser() user,
  ) {
    return this.adPaymentsService.update(id, updateAdPaymentDto);
  }

  // @Post(":id/process")
  // @Roles("ADMIN")
  // @ApiOperation({ summary: "Process ad payment" })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: "The ad payment has been successfully processed.",
  // })
  // @ApiParam({ name: "id", description: "Ad Payment ID" })
  // process(@Param('id') id: string, @CurrentUser() user) {
  //   return this.adPaymentsService.processPayment(id, user)
  // }

  @Post('webhook')
  @ApiOperation({ summary: 'Payment provider webhook' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully.',
  })
  webhook(@Body() webhookData: any, signature: any) {
    return this.adPaymentsService.processWebhook(webhookData, signature);
  }
}
