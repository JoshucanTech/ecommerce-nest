// src/shipping/dto/shipping-policy-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
// import { ShippingZoneResponseDto } from './shipping-zone-response.dto';
import { ShippingMethodResponseDto } from './shipping-method-response.dto';
import { ShippingZone } from '@prisma/client';
import { ShippingZoneResponseDto } from './shipping-zone-response.dto';

export class ShippingPolicyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  processingTime: string;

  @ApiProperty({ type: [ShippingMethodResponseDto] })
  shippingMethods: ShippingMethodResponseDto[];

  @ApiProperty({ type: [ShippingZoneResponseDto], required: false })
  shippingZones?: ShippingZoneResponseDto[];

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  vendorId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
