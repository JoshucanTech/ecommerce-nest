import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface Timezones {
  zoneName: string;
  gmtOffset: number;
  gmtOffsetName: string;
  abbreviation: string;
  tzName: string;
}

export class CountryDto {
  @ApiProperty({ example: 'US', description: 'ISO Alpha-2 country code' })
  isoCode: string;

  @ApiProperty({ example: 'United States', description: 'Full country name' })
  name: string;

  @ApiPropertyOptional({ example: 'USA', description: 'ISO Alpha-3 code' })
  iso3?: string;

  @ApiProperty({ example: '+1', description: 'Country phone code' })
  phonecode: string;

  @ApiPropertyOptional({
    example: 'US',
    description: 'Currency code (if available)',
  })
  currency?: string;

  @ApiPropertyOptional({ example: '🇺🇸', description: 'Country flag emoji' })
  flag?: string;

  @ApiPropertyOptional({
    example: 'North America',
    description: 'Geographic region',
  })
  region?: string;

  // @ApiPropertyOptional({
  //   example: 'US',
  //   description: 'Currency code (if available)',
  // })
  // latitude?: string;

  // @ApiPropertyOptional({ example: '🇺🇸', description: 'Country flag emoji' })
  // longitude?: string;

  // @ApiPropertyOptional({
  //   example: 'North America',
  //   description: 'Geographic region',
  // })
  // timezones?: Timezones[];
}
