import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { VehicleType } from '@prisma/client';

export class CreateRiderApplicationDto {
  @ApiProperty({
    description: 'Vehicle type',
    enum: VehicleType,
    example: VehicleType.MOTORCYCLE,
  })
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ApiPropertyOptional({
    description: 'Vehicle plate number',
    example: 'ABC123',
  })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiProperty({ description: 'Driver license number', example: 'DL12345678' })
  @IsString()
  licenseNumber: string;

  @ApiProperty({
    description: 'Identity document URL',
    example: 'https://example.com/id-document.pdf',
  })
  @IsString()
  identityDocument: string;

  @ApiProperty({ description: 'User ID', example: '1234-5678-9012' })
  @IsString()
  userId: string;
}
