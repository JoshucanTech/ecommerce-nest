import { ApiProperty, PartialType } from "@nestjs/swagger";
import { CreateNotificationDto } from "./create-notification.dto";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @ApiProperty({ description: "Mark notification as read", example: true })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}
