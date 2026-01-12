import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
    @ApiProperty({
        description: 'Array of permission IDs to assign',
        type: [String],
        example: ['perm-id-1', 'perm-id-2', 'perm-id-3'],
    })
    @IsArray()
    @IsString({ each: true })
    permissionIds: string[];
}
