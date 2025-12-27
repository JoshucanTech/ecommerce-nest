import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Preferred language code (ISO 639-1)',
    example: 'en',
    type: String,
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Preferred currency code (ISO 4217)',
    example: 'USD',
    type: String,
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Enable or disable dark mode interface',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable email notifications',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable push notifications',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable SMS notifications',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable marketing emails',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable new product emails',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  newProductEmails?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable account activity emails',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  accountActivityEmails?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable chat notifications',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  chatNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable promotion notifications',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  promotionNotifications?: boolean;
}
