import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class VendorBranchDto {
    @ApiPropertyOptional({ description: 'Nickname for the branch', example: 'Downtown Branch' })
    @IsOptional()
    @IsString()
    nickname?: string;

    @ApiProperty({ description: 'Street address', example: '123 Business St' })
    @IsString()
    street: string;

    @ApiProperty({ description: 'City', example: 'New York' })
    @IsString()
    city: string;

    @ApiProperty({ description: 'State', example: 'NY' })
    @IsString()
    state: string;

    @ApiProperty({ description: 'Postal code', example: '10001' })
    @IsString()
    postalCode: string;

    @ApiProperty({ description: 'Country', example: 'USA' })
    @IsString()
    country: string;

    @ApiPropertyOptional({ description: 'Is this the default branch?', example: false })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
