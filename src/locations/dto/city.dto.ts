import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CityDto {
  @ApiProperty({ example: 'Los Angeles', description: 'City name' })
  name: string;

  @ApiProperty({ example: 'CA', description: 'Parent state ISO code' })
  stateCode: string;

  @ApiProperty({ example: 'US', description: 'Parent country ISO code' })
  countryCode: string;

  @ApiPropertyOptional({ example: 'CA', description: 'Parent state ISO code' })
  latitude?: string | null;

  @ApiPropertyOptional({
    example: 'US',
    description: 'Parent country ISO code',
  })
  longitude?: string | null;
}
