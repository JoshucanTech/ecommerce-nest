import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsDateString, IsEnum } from "class-validator";
import { Gender } from "@prisma/client";

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "User bio",
    example: "I love shopping for tech gadgets!",
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: "Gender",
    enum: Gender,
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: "Birth date", example: "1990-01-01" })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
