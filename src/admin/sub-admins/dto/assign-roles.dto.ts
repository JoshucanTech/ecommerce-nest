import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRolesDto {
    @ApiProperty({
        description: 'Array of role IDs to assign',
        type: [String],
        example: ['role-id-1', 'role-id-2'],
    })
    @IsArray()
    @IsString({ each: true })
    roleIds: string[];
}
