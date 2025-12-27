import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsUUID,
  IsOptional,
  ValidateNested,
  IsInt,
  Min,
  IsObject,
  IsBoolean,
  IsNumber,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateShippingAddressDto } from '../../users/dto/create-shipping-address.dto';

export class OrderItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Product Variant ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit price', example: 10.99 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Total price', example: 21.98 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalPrice?: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Order items', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({
    description:
      'An object mapping vendor IDs to the selected shipping option ID for that vendor',
    example: { 'vendor-uuid-1': 'shipping-option-uuid-1' },
  })
  @IsOptional()
  @IsObject()
  shippingSelections?: Record<string, string>;

  @ApiProperty({ description: 'Payment method', example: 'CREDIT_CARD' })
  @IsString()
  @MinLength(1)
  paymentMethod: string;

  @ApiPropertyOptional({
    description: 'Address ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional({
    description: 'Coupon code code',
    example: 'SAVE10',
  })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiPropertyOptional({
    description: 'Order notes',
    example: 'Please deliver to the back door',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: "Use user's default address as shipping address",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  useUserAddress?: boolean;

  @ApiPropertyOptional({
    description: 'Use a saved shipping address',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  shippingAddressId?: string;

  @ApiPropertyOptional({
    description: 'Shipping address if different from user address',
    type: CreateShippingAddressDto,
  })
  @ValidateNested()
  @Type(() => CreateShippingAddressDto)
  @IsOptional()
  shippingAddress?: CreateShippingAddressDto;
}
