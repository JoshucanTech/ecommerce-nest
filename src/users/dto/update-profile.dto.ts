import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Gender } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "User's first name",
    example: 'John',
    type: String,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: "User's last name",
    example: 'Doe',
    type: String,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: "User's phone number",
    example: '+1234567890',
    type: String,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: "User's email address",
    example: 'john.doe@example.com',
    type: String,
  })
  @IsOptional()
  @IsString()
  email?: string;


  @ApiPropertyOptional({
    description: 'User biography or personal description',
    example: 'I love shopping for tech gadgets!',
    type: String,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'User gender identity',
    enum: Gender,
    example: Gender.MALE,
    enumName: 'Gender',
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'User birth date in ISO format',
    example: '1990-01-01',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
  @ApiPropertyOptional({
    description: 'Nested profile data (for backward compatibility)',
    type: Object,
  })
  @IsOptional()
  profile?: any;
}


