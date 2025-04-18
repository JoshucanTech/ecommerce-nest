import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional } from "class-validator";

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: "Preferred language", example: "en" })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: "Preferred currency", example: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: "Dark mode enabled", example: true })
  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @ApiPropertyOptional({
    description: "Email notifications enabled",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: "Push notifications enabled",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({
    description: "SMS notifications enabled",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;
}
