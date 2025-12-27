import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Updated comment content',
    example: 'I would like to know if this product is available in blue?',
  })
  @IsString()
  content: string;
}
