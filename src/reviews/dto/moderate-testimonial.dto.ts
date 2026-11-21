import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ModerateTestimonialDto {
  @ApiProperty({
    description: 'Approve or reject this consented review for homepage display',
    example: true,
  })
  @IsBoolean()
  approved: boolean;
}
