import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PaymentIntentItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsString()
  quantity: number;
}

export class CreatePaymentIntentDto {
  @ApiProperty({ type: [PaymentIntentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentIntentItemDto)
  items: PaymentIntentItemDto[];

  @ApiProperty()
  @IsObject()
  shippingSelections: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
}