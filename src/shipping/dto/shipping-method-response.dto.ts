// src/shipping/dto/shipping-method-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ShippingMethodResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  estimatedDelivery: string;

  @ApiProperty({ required: false })
  tags?: string[];
}
