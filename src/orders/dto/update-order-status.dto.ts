import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: "Order status",
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    description: "Status notes",
    example: "Order is being prepared for shipping",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
