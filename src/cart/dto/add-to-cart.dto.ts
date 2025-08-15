import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUUID, IsInt, Min, IsOptional, IsString } from "class-validator";

export class AddToCartDto {
  @ApiProperty({
    description: "Product ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: "Product Variant ID, for products with options like color or size",
    example: "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ description: "Quantity", example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: "ID of the selected shipping method",
    example: "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  })
  @IsOptional()
  @IsString()
  shippingId?: string;
}
