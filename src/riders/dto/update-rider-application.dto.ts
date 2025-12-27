import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { VehicleType, ApplicationStatus } from '@prisma/client';

export class UpdateRiderApplicationDto {
  @ApiPropertyOptional({
    description: 'Vehicle type',
    enum: VehicleType,
    example: VehicleType.MOTORCYCLE,
  })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({
    description: 'Vehicle plate number',
    example: 'ABC123',
  })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiPropertyOptional({
    description: 'Driver license number',
    example: 'DL12345678',
  })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Identity document URL',
    example: 'https://example.com/id-document.pdf',
  })
  @IsOptional()
  @IsString()
  identityDocument?: string;

  @ApiPropertyOptional({
    description: 'Application status',
    enum: ApplicationStatus,
    example: ApplicationStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Admin notes',
    example: 'All documents verified. Driver looks legitimate.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
