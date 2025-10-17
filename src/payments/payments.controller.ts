import { Controller, Post, Body, UseGuards, Headers, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { GenericPaymentDto } from './dto/generic-payment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent for orders' })
  createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @CurrentUser() user,
  ) {
    return this.paymentsService.createPaymentIntent(
      createPaymentIntentDto,
      user.id,
    );
  }

  @Post('process-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a generic payment for various purposes' })
  processGenericPayment(
    @Body() genericPaymentDto: GenericPaymentDto,
    @CurrentUser() user,
  ) {
    return this.paymentsService.processGenericPayment(
      genericPaymentDto,
      user.id,
    );
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle payment gateway webhooks' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') sig: string,
  ) {
    // In a real implementation, you would verify the webhook signature
    // and process the payment event
    return this.paymentsService.handleWebhook(req.body, sig);
  }

  @Post('flutterwave/webhook')
  @ApiOperation({ summary: 'Handle Flutterwave webhooks' })
  async handleFlutterwaveWebhook(
    @Req() req: Request,
    @Headers('verif-hash') signature: string,
  ) {
    return this.paymentsService.handleFlutterwaveWebhook(req.body, signature);
  }
}