import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
} from "class-validator";
import { VehicleType } from "@prisma/client";

export class UpdateRiderDto {
  @ApiPropertyOptional({
    description: "Vehicle type",
    enum: VehicleType,
    example: VehicleType.MOTORCYCLE,
  })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({
    description: "Vehicle plate number",
    example: "ABC123",
  })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiPropertyOptional({
    description: "Driver license number",
    example: "DL12345678",
  })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: "Identity document URL",
    example: "https://example.com/id-document.pdf",
  })
  @IsOptional()
  @IsString()
  identityDocument?: string;

  @ApiPropertyOptional({ description: "Is rider verified", example: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: "Is rider available for deliveries",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: "Current latitude", example: 40.7128 })
  @IsOptional()
  @IsNumber()
  currentLatitude?: number;

  @ApiPropertyOptional({ description: "Current longitude", example: -74.006 })
  @IsOptional()
  @IsNumber()
  currentLongitude?: number;
}
