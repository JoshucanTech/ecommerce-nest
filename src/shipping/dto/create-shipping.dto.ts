// src/shipping/dto/create-shipping.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ShippingMethodDto {
  @ApiProperty({
    example: 'Standard Shipping',
    description: 'Name of the shipping method',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 5.99,
    description: 'Price for this shipping method',
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    example: '3-5 business days',
    description: 'Estimated delivery time',
  })
  @IsString()
  @IsNotEmpty()
  estimatedDelivery: string;

  @ApiProperty({
    example: ['US', 'CA'],
    description: 'Countries this method applies to',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countries?: string[];

  @ApiProperty({
    example: ['FREE', 'DISCOUNT'],
    description: 'Applicable shipping promotions',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

class ShippingZoneDto {
  @ApiProperty({
    example: 'US',
    description: 'Country code',
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    example: 'California',
    description: 'Region/state',
    required: false,
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({
    example: '90001',
    description: 'Postal code range',
    required: false,
  })
  @IsString()
  @IsOptional()
  postalCode?: string;
}

export class CreateShippingDto {
  @ApiProperty({
    example: 'Standard Policy',
    description: 'Name of the shipping policy',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Our standard shipping options',
    description: 'Policy description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '1-2 business days',
    description: 'Default processing time before shipment',
  })
  @IsString()
  @IsNotEmpty()
  processingTime: string;

  @ApiProperty({
    type: [ShippingMethodDto],
    description: 'Available shipping methods',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingMethodDto)
  shippingMethods: ShippingMethodDto[];

  @ApiProperty({
    type: [ShippingZoneDto],
    description: 'Shipping zones where this policy applies',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingZoneDto)
  @IsOptional()
  shippingZones?: ShippingZoneDto[];

  @ApiProperty({
    example: true,
    description: 'Whether this is the default policy for the vendor',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether this policy is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: '3-5 business days' })
  @IsString()
  @IsNotEmpty()
  deliveryTime: string;

  @ApiProperty({ example: 5.99 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 'vendor-id' })
  @IsString()
  vendor: string;
}
