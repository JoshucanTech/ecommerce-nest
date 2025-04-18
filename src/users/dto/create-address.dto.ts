import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional } from "class-validator";

export class CreateAddressDto {
  @ApiProperty({ description: "Street address", example: "123 Main St" })
  @IsString()
  street: string;

  @ApiProperty({ description: "City", example: "New York" })
  @IsString()
  city: string;

  @ApiProperty({ description: "State/Province", example: "NY" })
  @IsString()
  state: string;

  @ApiProperty({ description: "Postal code", example: "10001" })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: "Country", example: "USA" })
  @IsString()
  country: string;

  @ApiPropertyOptional({ description: "Is default address", default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
