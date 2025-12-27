import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Street address including house number and street name',
    example: '123 Main St',
    type: String,
  })
  @IsString()
  street: string;

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
    description: 'Whether this address should be marked as the default address',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
