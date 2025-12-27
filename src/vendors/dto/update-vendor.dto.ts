import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { VendorAddress } from '@prisma/client';

export class UpdateVendorDto {
  @ApiPropertyOptional({
    description: 'Business name',
    example: 'Tech Gadgets Pro',
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Business email',
    example: 'contact@techgadgetspro.com',
  })
  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @ApiPropertyOptional({
    description: 'Business phone',
    example: '+1987654321',
  })
  @IsOptional()
  @IsString()
  businessPhone?: string;

  @ApiPropertyOptional({
    description: 'Business address',
    example: '456 Business Ave, New York, NY 10002',
  })
  @IsOptional()
  businessAddress?: VendorAddress;

  @ApiPropertyOptional({
    description: 'Business logo URL',
    example: 'https://example.com/new-logo.jpg',
  })
  @IsOptional()
  @IsString()
  businessLogo?: string;

  @ApiPropertyOptional({
    description: 'Business description',
    example: 'Premium tech gadgets and accessories for professionals.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Commission rate percentage',
    example: 12.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}
