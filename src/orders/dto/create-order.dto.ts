import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsArray,
  IsUUID,
  IsOptional,
  ValidateNested,
  IsInt,
  Min,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

class OrderItemDto {
  @ApiProperty({
    description: "Product ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: "Quantity", example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: "Order items", type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    description:
      "An object mapping vendor IDs to the selected shipping option ID for that vendor",
    example: { "vendor-uuid-1": "shipping-option-uuid-1" },
  })
  @IsObject()
  shippingSelections: Record<string, string>;

  @ApiProperty({ description: "Payment method", example: "CREDIT_CARD" })
  @IsString()
  paymentMethod: string;

  @ApiProperty({
    description: "Address ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  addressId: string;

  @ApiPropertyOptional({ description: "Coupon code", example: "SUMMER20" })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    description: "Order notes",
    example: "Please leave at the front door",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
