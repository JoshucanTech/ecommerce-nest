import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsDateString, IsEnum } from "class-validator";
import { Gender } from "@prisma/client";

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "User biography or personal description",
    example: "I love shopping for tech gadgets!",
    type: String
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: "User gender identity",
    enum: Gender,
    example: Gender.MALE,
    enumName: "Gender"
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ 
    description: "User birth date in ISO format",
    example: "1990-01-01",
    type: String
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}