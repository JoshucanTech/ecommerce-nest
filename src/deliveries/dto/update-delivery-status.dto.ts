import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { DeliveryStatus } from "@prisma/client";

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    description: "Delivery status",
    enum: DeliveryStatus,
    example: DeliveryStatus.PICKED_UP,
  })
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;

  @ApiPropertyOptional({
    description: "Notes",
    example: "Package picked up from vendor",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
