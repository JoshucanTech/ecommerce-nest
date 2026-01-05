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

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://techgadgetspro.com',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://example.com/cover.jpg',
  })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({
    description: 'Social media links',
    example: { twitter: '@techgadgets', facebook: 'techgadgets' },
  })
  @IsOptional()
  socialMedia?: any;

  @ApiPropertyOptional({
    description: 'Bank information',
    example: { bankName: 'Global Bank', accountNumber: '123456789' },
  })
  @IsOptional()
  bankInfo?: any;

  @ApiPropertyOptional({
    description: 'Active status',
    example: true,
  })
  @IsOptional()
  isActive?: boolean;
}
