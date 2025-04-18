import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  IsEnum,
} from "class-validator";
import { ApplicationStatus } from "@prisma/client";

export class UpdateVendorApplicationDto {
  @ApiPropertyOptional({
    description: "Business name",
    example: "Tech Gadgets Pro",
  })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    description: "Business email",
    example: "contact@techgadgetspro.com",
  })
  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @ApiPropertyOptional({
    description: "Business phone",
    example: "+1987654321",
  })
  @IsOptional()
  @IsString()
  businessPhone?: string;

  @ApiPropertyOptional({
    description: "Business address",
    example: "456 Business Ave, New York, NY 10002",
  })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional({
    description: "Business logo URL",
    example: "https://example.com/new-logo.jpg",
  })
  @IsOptional()
  @IsString()
  businessLogo?: string;

  @ApiPropertyOptional({
    description: "Business description",
    example: "Premium tech gadgets and accessories for professionals.",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Document URLs",
    type: [String],
    example: ["https://example.com/doc1.pdf", "https://example.com/doc2.pdf"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @ApiPropertyOptional({
    description: "Application status",
    enum: ApplicationStatus,
    example: ApplicationStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description: "Admin notes",
    example: "All documents verified. Business looks legitimate.",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
