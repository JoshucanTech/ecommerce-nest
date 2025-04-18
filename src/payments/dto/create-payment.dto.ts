// backend/src/payments/dto/create-payment.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
} from "class-validator";
import { PaymentMethod, PaymentStatus, PaymentType } from "@prisma/client";

// Base DTO for creating a payment
export class CreatePaymentDto {
  @ApiProperty({
    description: "Order ID or related entity ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  @IsNotEmpty()
  entityId: string; // Could be orderId, riderId, etc.

  @ApiProperty({
    description: "Payment type",
    example: "ORDER",
    enum: ["ORDER", "RIDER_PAYMENT", "FEATURE_PAYMENT"],
  })
  @IsEnum(PaymentType)
  @IsNotEmpty()
  paymentType: PaymentType; // e.g., 'ORDER', 'RIDER_PAYMENT', 'FEATURE_PAYMENT'

  @ApiProperty({
    description: "Payment method",
    example: `${PaymentMethod.CREDIT_CARD}`,
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;

  @ApiProperty({ description: "Amount to be paid", example: 199.99 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: "Transaction reference from payment provider",
    required: false,
  })
  @IsString()
  @IsOptional()
  transactionReference?: string;

  @ApiProperty({
    description: "Payment status",
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
    default: PaymentStatus.PENDING,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus = PaymentStatus.PENDING;

  @ApiPropertyOptional({ description: "Additional details", type: Object })
  @IsOptional()
  @IsObject()
  details?: any; // Use any or a specific type based on payment type
}

// DTO for order payments (extends CreatePaymentDto)
export class CreateOrderPaymentDto extends CreatePaymentDto {
  @ApiProperty({
    description: "Order ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  orderId: string;
}

// DTO for rider payments (extends CreatePaymentDto)
export class CreateRiderPaymentDto extends CreatePaymentDto {
  @ApiProperty({
    description: "Rider ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  riderId: string;
}

// DTO for feature payments (extends CreatePaymentDto)
export class CreateFeaturePaymentDto extends CreatePaymentDto {
  @ApiProperty({ description: "Feature ID", example: "feature-123" })
  @IsString()
  featureId: string;
}
