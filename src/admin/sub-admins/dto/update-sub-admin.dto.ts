import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString } from 'class-validator';
import { CreateSubAdminDto } from './create-sub-admin.dto';

export class UpdateSubAdminDto extends PartialType(
    OmitType(CreateSubAdminDto, ['password', 'email'] as const),
) {
    @ApiPropertyOptional({
        description: 'Position IDs to assign',
        type: [String],
        example: ['position-id-1'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    positionIds?: string[];
}
