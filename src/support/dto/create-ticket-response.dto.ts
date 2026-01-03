import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketResponseDto {
    @ApiProperty({
        description: 'The content of the response',
        example: 'Thank you for reaching out. We are looking into your issue.',
    })
    @IsString()
    @IsNotEmpty()
    content: string;
}
