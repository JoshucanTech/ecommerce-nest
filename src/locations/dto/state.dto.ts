import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StateDto {
  @ApiProperty({ example: 'CA', description: 'State ISO code' })
  isoCode: string;

  @ApiProperty({ example: 'California', description: 'State name' })
  name: string;

  @ApiProperty({ example: 'US', description: 'Parent country ISO code' })
  countryCode: string;

  @ApiPropertyOptional({ example: 'California', description: 'State name' })
  latitude?: string | null;

  @ApiPropertyOptional({
    example: 'US',
    description: 'Parent country ISO code',
  })
  longitude?: string | null;
}
