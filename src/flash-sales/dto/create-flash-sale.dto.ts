import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

class FlashSaleItemDto {
  @ApiProperty({
    description: "Product ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: "Discount percentage", example: 25 })
  @IsNumber()
  @Min(1)
  @Max(99)
  discountPercentage: number;

  @ApiProperty({
    description: "Available quantity for flash sale",
    example: 50,
  })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateFlashSaleDto {
  @ApiProperty({ description: "Flash sale name", example: "Summer Clearance" })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Flash sale description",
    example: "Huge discounts on summer items!",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Start date and time",
    example: "2023-07-01T00:00:00Z",
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: "End date and time",
    example: "2023-07-07T23:59:59Z",
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: "Whether the flash sale is active",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: "Flash sale items", type: [FlashSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlashSaleItemDto)
  items: FlashSaleItemDto[];
}
