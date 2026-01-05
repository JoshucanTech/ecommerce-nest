import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class CreateDeliveryDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Pickup address',
    example: '123 Vendor St, New York, NY 10001',
  })
  @IsString()
  pickupAddress: string;

  @ApiPropertyOptional({ description: 'Pickup latitude' })
  @IsOptional()
  pickupLatitude?: number;

  @ApiPropertyOptional({ description: 'Pickup longitude' })
  @IsOptional()
  pickupLongitude?: number;

  @ApiProperty({
    description: 'Delivery address',
    example: '456 Customer Ave, New York, NY 10002',
  })
  @IsString()
  deliveryAddress: string;

  @ApiPropertyOptional({ description: 'Delivery latitude' })
  @IsOptional()
  deliveryLatitude?: number;

  @ApiPropertyOptional({ description: 'Delivery longitude' })
  @IsOptional()
  deliveryLongitude?: number;

  @ApiPropertyOptional({
    description: 'Estimated delivery time',
    example: '2023-07-15T14:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryTime?: string;

  @ApiPropertyOptional({
    description: 'Notes',
    example: 'Please handle with care',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
