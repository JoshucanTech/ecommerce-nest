import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsJSON,
} from 'class-validator';
import { AdPlatform } from '@prisma/client';

export class CreateAdPlatformConfigDto {
  @ApiProperty({ example: 'advertisement-uuid' })
  @IsString()
  advertisementId: string;

  @ApiProperty({ example: 'ad config name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: AdPlatform, example: AdPlatform.FACEBOOK })
  @IsEnum(AdPlatform)
  platform: AdPlatform;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'platform-ad-id-123' })
  @IsOptional()
  @IsString()
  platformAdId?: string;

  @ApiPropertyOptional({ example: 'platform-campaign-id-123' })
  @IsOptional()
  @IsString()
  platformCampaignId?: string;

  @ApiPropertyOptional({
    example: { placementType: 'feed', audienceExpansion: true },
  })
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    example: {
      key: 'value',
      'platform-campaign-id': 'platform-campaign-id-123',
    },
  })
  @IsJSON()
  config: {};
}
