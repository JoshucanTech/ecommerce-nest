import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';

// Import AddressType enum
import { AddressType } from '../enums/address-type.enum';

export class UpdateShippingAddressDto {
  @ApiPropertyOptional({
    description: 'Street address including house number and street name',
    example: '123 Main St',
    type: String,
  })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({
    description: 'City name',
    example: 'New York',
    type: String,
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'State or province',
    example: 'NY',
    type: String,
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal or ZIP code',
    example: '10001',
    type: String,
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country name',
    example: 'USA',
    type: String,
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    description:
      'Whether this address should be marked as the default shipping address',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: "Nickname for the address (e.g., 'Home', 'Work', 'Gift')",
    example: 'Home',
    type: String,
  })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({
    description: 'Type classification for the address',
    example: 'HOME',
    enum: AddressType,
  })
  @IsEnum(AddressType)
  @IsOptional()
  addressType?: AddressType;

  @ApiPropertyOptional({
    description: 'Whether the shared user can edit this address',
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  @IsOptional()
  canEdit?: boolean;

  @ApiPropertyOptional({
    description: 'Expiration date for shared access',
    example: '2024-12-31T23:59:59Z',
    type: Date,
  })
  @IsOptional()
  expiresAt?: Date;
}
