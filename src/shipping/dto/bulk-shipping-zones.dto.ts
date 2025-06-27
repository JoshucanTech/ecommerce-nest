// src/shipping/dto/bulk-shipping-zones.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateShippingZoneDto } from './create-shipping-zone.dto';

export class BulkShippingZonesDto {
  @ApiProperty({
    type: [CreateShippingZoneDto],
    description: 'Array of shipping zones to create',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShippingZoneDto)
  zones: CreateShippingZoneDto[];
}
