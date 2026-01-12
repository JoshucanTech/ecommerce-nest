import { IsOptional, IsEnum, IsString, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Type } from 'class-transformer';

export class FilterPermissionsDto {
    @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10 })
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Search by name or description' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ enum: PermissionAction, description: 'Filter by action' })
    @IsEnum(PermissionAction)
    @IsOptional()
    action?: PermissionAction;

    @ApiPropertyOptional({ enum: PermissionResource, description: 'Filter by resource' })
    @IsEnum(PermissionResource)
    @IsOptional()
    resource?: PermissionResource;

    @ApiPropertyOptional({ description: 'Filter by category' })
    @IsString()
    @IsOptional()
    category?: string;
}
