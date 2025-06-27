// src/shipping/dto/create-shipping-zone.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateShippingZoneDto {
  @ApiProperty({
    example: 'US',
    description: 'ISO 2-letter country code',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{2}$/, {
    message: 'Country code must be 2 uppercase letters',
  })
  country: string;

  @ApiProperty({
    example: 'California',
    description: 'Region/state within the country',
    required: false,
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({
    example: '90001',
    description: 'Postal code or ZIP code range',
    required: false,
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({
    description: 'ID of the shipping method this zone applies to',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  shippingId: string;
}
