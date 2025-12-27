import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ description: 'Current latitude', example: 40.7128 })
  @IsNumber()
  currentLatitude: number;

  @ApiProperty({ description: 'Current longitude', example: -74.006 })
  @IsNumber()
  currentLongitude: number;
}
