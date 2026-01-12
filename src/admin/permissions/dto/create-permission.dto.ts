import { IsEnum, IsString, IsOptional, IsInt, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionAction, PermissionResource } from '@prisma/client';

export class CreatePermissionDto {
    @ApiProperty({ description: 'Unique permission name', example: 'view_users' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Permission description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: PermissionAction, description: 'Permission action' })
    @IsEnum(PermissionAction)
    action: PermissionAction;

    @ApiProperty({ enum: PermissionResource, description: 'Resource type' })
    @IsEnum(PermissionResource)
    resource: PermissionResource;

    @ApiPropertyOptional({ description: 'Scope configuration (JSON)', example: { type: 'GEOGRAPHIC', value: { cities: ['New York'] } } })
    @IsObject()
    @IsOptional()
    scope?: any;

    @ApiPropertyOptional({ description: 'Hierarchy level (0-10)', example: 0, default: 0 })
    @IsInt()
    @IsOptional()
    level?: number;

    @ApiPropertyOptional({ description: 'Permission category', example: 'User Management' })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({ description: 'Advanced conditions (JSON)' })
    @IsObject()
    @IsOptional()
    conditions?: any;

    @ApiPropertyOptional({ description: 'Is permission active', default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
