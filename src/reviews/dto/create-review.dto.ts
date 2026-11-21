import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsString,
  IsOptional,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Rating (1-5)', example: 4 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Review comment',
    example: 'Great product, very satisfied with the quality.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(/\S/)
  comment?: string;

  @ApiPropertyOptional({
    description:
      'Consent to display this review as a public homepage testimonial, using the customer first name and last initial. Requires admin approval.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  testimonialConsent?: boolean;

  @ApiPropertyOptional({ description: 'Optional review title' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}
