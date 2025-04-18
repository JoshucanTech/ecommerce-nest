import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  Min,
  IsUUID,
} from "class-validator";

export class CreateProductDto {
  @ApiProperty({ description: "Product name", example: "Wireless Headphones" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Product description",
    example: "High-quality wireless headphones with noise cancellation",
  })
  @IsString()
  description: string;

  @ApiProperty({ description: "Product price", example: 99.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: "Discounted price", example: 79.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @ApiProperty({ description: "Initial product quantity", example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: "Product SKU", example: "WH-NC100-BLK" })
  @IsString()
  sku: string;

  @ApiProperty({
    description: "Product images URLs",
    type: [String],
    example: [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
    ],
  })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiPropertyOptional({
    description: "Whether the product is published",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiProperty({
    description: "Category ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  categoryId: string;
}
