import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID } from "class-validator"
import { AdPlatform } from "@prisma/client"

export class CreateAdPlatformConfigDto {
  @ApiProperty({ example: "advertisement-uuid" })
  @IsUUID()
  advertisementId: string

  @ApiProperty({ enum: AdPlatform, example: AdPlatform.FACEBOOK })
  @IsEnum(AdPlatform)
  platform: AdPlatform

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ example: "platform-ad-id-123" })
  @IsOptional()
  @IsString()
  platformAdId?: string

  @ApiPropertyOptional({ example: "platform-campaign-id-123" })
  @IsOptional()
  @IsString()
  platformCampaignId?: string

  @ApiPropertyOptional({ example: { placementType: "feed", audienceExpansion: true } })
  @IsOptional()
  settings?: Record<string, any>
}
