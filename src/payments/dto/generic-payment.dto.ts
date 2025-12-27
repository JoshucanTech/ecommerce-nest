import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  ValidateNested,
  IsEnum,
} from 'class-validator';

export enum PaymentPurpose {
  ORDER = 'ORDER',
  SUBSCRIPTION = 'SUBSCRIPTION',
  DONATION = 'DONATION',
  WALLET_TOPUP = 'WALLET_TOPUP',
  SERVICE_FEE = 'SERVICE_FEE',
  OTHER = 'OTHER',
}

export class PaymentItemDto {
  @ApiProperty({ description: 'Description of the item being paid for' })
  @IsString()
  description: string;

  @ApiProperty({
    description:
      'Amount for this item in the smallest currency unit (e.g., cents)',
  })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Quantity of items' })
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Reference ID for the item' })
  @IsString()
  @IsOptional()
  referenceId?: string;
}

export class GenericPaymentDto {
  @ApiProperty({ description: 'Purpose of the payment' })
  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;

  @ApiProperty({ description: 'Currency code (e.g., USD, EUR)' })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Total amount in the smallest currency unit (e.g., cents)',
    example: 1000,
  })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Collection of items being paid for' })
  @ValidateNested({ each: true })
  @IsOptional()
  items?: PaymentItemDto[];

  @ApiPropertyOptional({ description: 'Additional metadata for the payment' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Reference ID for the payment' })
  @IsString()
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Description of the payment' })
  @IsString()
  @IsOptional()
  description?: string;
}
