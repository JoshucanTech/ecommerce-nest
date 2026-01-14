import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePositionDto {
    @ApiProperty({ description: 'Position name', example: 'Regional Manager' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Position description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Is position active', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Permission IDs to assign to this position',
        type: [String],
        example: ['perm-id-1', 'perm-id-2'],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissionIds?: string[];
}
