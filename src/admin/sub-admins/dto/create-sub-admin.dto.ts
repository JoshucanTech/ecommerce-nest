import {
    IsString,
    IsEmail,
    IsOptional,
    IsArray,
    IsBoolean,
    MinLength,
    IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubAdminDto {
    @ApiProperty({ description: 'Email address', example: 'subadmin@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Password (min 8 characters)', example: 'SecurePass123!' })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ description: 'First name', example: 'John' })
    @IsString()
    firstName: string;

    @ApiProperty({ description: 'Last name', example: 'Doe' })
    @IsString()
    lastName: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({
        description: 'Role IDs to assign',
        type: [String],
        example: ['role-id-1', 'role-id-2'],
    })
    @IsArray()
    @IsString({ each: true })
    roleIds: string[];

    @ApiPropertyOptional({
        description: 'Allowed cities (empty = all)',
        type: [String],
        example: ['New York', 'Los Angeles'],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    allowedCities?: string[];

    @ApiPropertyOptional({
        description: 'Allowed states (empty = all)',
        type: [String],
        example: ['NY', 'CA'],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    allowedStates?: string[];

    @ApiPropertyOptional({
        description: 'Allowed regions (empty = all)',
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    allowedRegions?: string[];

    @ApiPropertyOptional({
        description: 'Allowed countries (empty = all)',
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
        description: 'Valid from date (ISO 8601)',
        example: '2024-01-01T00:00:00Z',
    })
    @IsDateString()
    @IsOptional()
    validFrom?: string;

    @ApiPropertyOptional({
        description: 'Valid until date (ISO 8601)',
        example: '2024-12-31T23:59:59Z',
    })
    @IsDateString()
    @IsOptional()
    validUntil?: string;

    @ApiPropertyOptional({ description: 'Notes about this sub-admin' })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ description: 'Is sub-admin active', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
