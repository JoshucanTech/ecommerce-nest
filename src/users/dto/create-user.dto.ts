import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: "User's email address (must be unique)",
    type: String,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: "User's password (minimum 6 characters)",
    minLength: 6,
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    example: 'John',
    description: "User's first name",
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: "User's last name",
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: "User's phone number with country code",
    type: String,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: "URL to user's avatar image",
    type: String,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'User role in the system',
    example: UserRole.BUYER,
    enumName: 'UserRole',
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
