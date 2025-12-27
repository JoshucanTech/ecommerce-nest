// src/shipping/dto/create-shipping.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum DeliverySystem {
  PLATFORM = 'platform',
  VENDOR = 'vendor',
}

export enum ShippingType {
  STANDARD = 'STANDARD',
  EXPEDITED = 'EXPEDITED',
  TWO_DAY = 'TWO_DAY',
  ONE_DAY = 'ONE_DAY',
  SAME_DAY = 'SAME_DAY',
  INTERNATIONAL = 'INTERNATIONAL',
}

export enum FulfillmentType {
  MERCHANT = 'MERCHANT', // Fulfilled by Merchant (FBM)
  PLATFORM = 'PLATFORM', // Fulfilled by App (FBA)
  PRIME = 'PRIME', // Seller Fulfilled Prime (SFP)
}

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

  @ApiProperty({
    enum: ShippingType,
    example: ShippingType.STANDARD,
    description: 'Type of shipping method',
  })
  @IsEnum(ShippingType)
  @IsOptional()
  shippingType?: ShippingType;
}

export class ShippingZoneDto {
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
    description: 'Postal code or range',
    required: false,
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({
    example: 'Los Angeles',
    description: 'City name',
    required: false,
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    example: 5.99,
    description: 'Zone-specific price override',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({
    example: 0,
    description: 'Minimum weight for this price',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  minWeight?: number;

  @ApiProperty({
    example: 10,
    description: 'Maximum weight for this price',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxWeight?: number;

  @ApiProperty({
    example: 50,
    description: 'Minimum order price for free shipping',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @ApiProperty({
    example: 1000,
    description: 'Maximum order price for this rule',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxPrice?: number;
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

  @ApiProperty({
    example: '3-5 business days',
    description: 'Delivery time estimation',
  })
  @IsString()
  @IsNotEmpty()
  deliveryTime: string;

  @ApiProperty({
    example: 5.99,
    description: 'Shipping price',
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    example: 'vendor-id',
    description: 'Vendor ID (required for vendor-specific methods)',
    required: false,
  })
  @IsString()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({
    enum: ShippingType,
    example: ShippingType.STANDARD,
    description: 'Type of shipping method',
  })
  @IsEnum(ShippingType)
  @IsOptional()
  shippingType?: ShippingType;
}
