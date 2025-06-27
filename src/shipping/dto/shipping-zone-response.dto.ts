// src/shipping/dto/shipping-zone-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ShippingZoneResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier for the shipping zone',
  })
  id: string;

  @ApiProperty({
    example: 'US',
    description: 'ISO 2-letter country code',
  })
  country: string;

  @ApiProperty({
    example: 'California',
    description: 'Region/state within the country',
    required: false,
  })
  region?: string;

  @ApiProperty({
    example: '90001',
    description: 'Postal code or ZIP code range',
    required: false,
  })
  postalCode?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID of the associated shipping method',
  })
  shippingId: string;

  @ApiProperty({
    description: 'Date when the shipping zone was created',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the shipping zone was last updated',
  })
  updatedAt: Date;
}
