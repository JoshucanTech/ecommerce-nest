import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateReviewDto {
  @ApiPropertyOptional({ description: 'Rating (1-5)', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Review comment',
    example: 'After using it for a while, I am even more impressed!',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(/\S/)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Update or revoke consent to feature this review as a testimonial',
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
