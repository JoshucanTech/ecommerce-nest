import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsJSON,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { NotificationType } from "@prisma/client";

export class CreateNotificationDto {
  @ApiProperty({ description: "User ID to send notification to" })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: "Notification title",
    example: "Order Confirmed",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: "Notification message",
    example: "Your order #12345 has been confirmed",
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: "Notification type",
    enum: NotificationType,
    example: NotificationType.ORDER_STATUS,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: "Related entity ID (order, product, etc.)",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  entityId?: string;

  @ApiProperty({
    description: "Related entity ID (order, product, etc.)",
    required: false,
  })
  @IsJSON()
  @IsOptional()
  data?: string;

  @ApiProperty({
    description: "URL to redirect when notification is clicked",
    required: false,
  })
  @IsString()
  @IsOptional()
  redirectUrl?: string;
}
