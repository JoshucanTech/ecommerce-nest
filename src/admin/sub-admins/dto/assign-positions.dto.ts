import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPositionsDto {
    @ApiProperty({
        description: 'Array of position IDs to assign',
        type: [String],
        example: ['position-id-1', 'position-id-2'],
    })
    @IsArray()
    @IsString({ each: true })
    positionIds: string[];
}
