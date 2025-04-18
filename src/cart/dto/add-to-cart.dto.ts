import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, IsInt, Min } from "class-validator";

export class AddToCartDto {
  @ApiProperty({
    description: "Product ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: "Quantity", example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
