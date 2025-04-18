import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsEmail, IsBoolean } from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "First name", example: "John" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: "Last name", example: "Doe" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: "Email",
    example: "john.doe@example.com",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Phone number", example: "+1234567890" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: "Avatar URL",
    example: "https://example.com/avatar.jpg",
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: "Is user active", example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
