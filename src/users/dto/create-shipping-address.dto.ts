import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  MinLength,
  Min,
  IsNumber,
} from 'class-validator';

// Import AddressType enum
import { AddressType } from '../enums/address-type.enum';

export class CreateShippingAddressDto {
  @ApiProperty({
    description: 'Street address including house number and street name',
    example: '123 Main St',
    type: String,
  })
  @IsString()
  street: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({
    description: 'City name',
    example: 'New York',
    type: String,
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'State or province',
    example: 'NY',
    type: String,
  })
  @IsString()
  state: string;

  @ApiProperty({
    description: 'Postal or ZIP code',
    example: '10001',
    type: String,
  })
  @IsString()
  postalCode: string;

  @ApiProperty({
    description: 'Country name',
    example: 'USA',
    type: String,
  })
  @IsString()
  country: string;

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
    description: 'User ID to share this address with',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @IsString()
  @IsOptional()
  sharedWithId?: string;

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

  @ApiProperty({ description: 'Phone / Call Number', example: 2347012345678 })
  @IsNumber()
  @IsOptional()
  @Min(5)
  phone?: number;
}
