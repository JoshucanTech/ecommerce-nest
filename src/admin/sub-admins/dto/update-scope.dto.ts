import { IsArray, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateScopeDto {
    @ApiPropertyOptional({
        description: 'Allowed cities',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    allowedCities?: string[];

    @ApiPropertyOptional({
        description: 'Allowed states',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    allowedStates?: string[];

    @ApiPropertyOptional({
        description: 'Allowed regions',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    allowedRegions?: string[];

    @ApiPropertyOptional({
        description: 'Allowed countries',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    allowedCountries?: string[];

    @ApiPropertyOptional({
        description: 'Departments',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    departments?: string[];

    @ApiPropertyOptional({
        description: 'Teams',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    teams?: string[];

    @ApiPropertyOptional({
        description: 'Valid from date',
    })
    @IsDateString()
    @IsOptional()
    validFrom?: string;

    @ApiPropertyOptional({
        description: 'Valid until date',
    })
    @IsDateString()
    @IsOptional()
    validUntil?: string;
}
