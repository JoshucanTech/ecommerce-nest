import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Headphones for now',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'High-quality wireless headphones with noise cancellation',
  })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Product price', example: 99.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Discounted price', example: 79.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @ApiProperty({ description: 'Initial product quantity', example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Product SKU', example: 'WH-NC100-BLK' })
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Product images URLs',
    type: [String],
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiPropertyOptional({
    description: 'Whether the product is published',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Short description of the product',
    example: 'High-quality headphones',
  })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Warranty information',
    example: '1 year warranty',
  })
  @IsOptional()
  @IsString()
  warrantyInfo?: string;

  @ApiPropertyOptional({
    description: 'Return policy details',
    example: '30-day return policy',
  })
  @IsOptional()
  @IsString()
  returnPolicy?: string;

  @ApiPropertyOptional({
    description: 'SEO Meta Title',
    example: 'Premium Wireless Headphones',
  })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO Meta Description',
    example: 'Buy premium wireless headphones at the best price.',
  })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'Product tags',
    type: [String],
    example: ['electronics', 'audio'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Shipping Policy ID',
    example: '50dae785-a67e-451b-a4f3-d60a8f652e3d',
  })
  @IsOptional()
  @IsUUID()
  shippingPolicyId?: string;

  @ApiProperty({
    description: 'Array of Category IDs',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  categoryIds: string[];
}
