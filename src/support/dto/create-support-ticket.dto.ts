import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';

export class CreateSupportTicketDto {
    @ApiProperty({
        description: 'The subject of the support ticket',
        example: 'Payment not received',
    })
    @IsString()
    @IsNotEmpty()
    subject: string;

    @ApiProperty({
        description: 'Detailed description of the issue',
        example: 'I have not received my payment for the last week deliveries.',
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: 'Priority of the ticket',
        enum: TicketPriority,
        default: 'MEDIUM',
    })
    @IsEnum(TicketPriority)
    @IsOptional()
    priority?: TicketPriority;

    @ApiProperty({
        description: 'Category of the ticket',
        example: 'payment',
    })
    @IsString()
    @IsNotEmpty()
    category: string;
}
