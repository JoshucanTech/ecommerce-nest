import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from "class-validator";
import { UserRole } from "@prisma/client";

export class CreateUserDto {
  @ApiProperty({
    example: "user@example.com",
    description: "User email address",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @ApiProperty({
    example: "password123",
    description: "User password",
  })
  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  password: string;

  @ApiProperty({
    example: "John",
    description: "User first name",
  })
  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  firstName: string;

  @ApiProperty({
    example: "Doe",
    description: "User last name",
  })
  @IsString()
  @IsNotEmpty({ message: "Last name is required" })
  lastName: string;

  @ApiProperty({
    example: "+1234567890",
    description: "User phone number",
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: "https://example.com/avatar.jpg",
    description: "User avatar URL",
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    enum: UserRole,
    description: "User role",
    default: UserRole.BUYER,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
