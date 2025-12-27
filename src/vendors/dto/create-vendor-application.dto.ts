import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { VendorAddress } from '@prisma/client';

export class CreateVendorApplicationDto {
  @ApiProperty({
    description: 'user id',
    example: 'asdf-321f-1234-1234-123456789000',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Business name', example: 'Tech Gadgets' })
  @IsString()
  businessName: string;

  @ApiProperty({
    description: 'Business email',
    example: 'contact@techgadgets.com',
  })
  @IsEmail()
  businessEmail: string;

  @ApiProperty({ description: 'Business phone', example: '+1234567890' })
  @IsString()
  businessPhone: string;

  @ApiProperty({
    description: 'Business address',
    example: '123 Business St, New York, NY 10001',
  })
  @IsOptional()
  businessAddress: VendorAddress;

  @ApiPropertyOptional({
    description: 'Business logo URL',
    example: 'https://example.com/logo.jpg',
  })
  @IsOptional()
  @IsString()
  businessLogo?: string;

  @ApiPropertyOptional({
    description: 'Business description',
    example: 'We sell high-quality tech gadgets and accessories.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Document URLs',
    type: [String],
    example: ['https://example.com/doc1.pdf', 'https://example.com/doc2.pdf'],
  })
  @IsArray()
  @IsString({ each: true })
  documents: string[];
}
