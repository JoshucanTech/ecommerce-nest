import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator"
import { AdPlatform } from "@prisma/client"

export class AdAnalyticsQueryDto {
  @ApiProperty({ example: "advertisement-uuid" })
  @IsUUID()
  advertisementId: string

  @ApiProperty({ example: "2023-01-01" })
  @IsDateString()
  startDate: string

  @ApiProperty({ example: "2023-01-31" })
  @IsDateString()
  endDate: string

  @ApiPropertyOptional({ enum: AdPlatform })
  @IsOptional()
  @IsEnum(AdPlatform)
  platform?: AdPlatform
}
