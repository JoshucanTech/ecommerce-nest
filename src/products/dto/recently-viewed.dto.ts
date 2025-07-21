import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordViewDto {
  @ApiProperty({
    description: 'The ID of the product being viewed',
    example: 'prod_123456',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'The ID of the user if logged in',
    example: 'user_78910',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'The session ID if the user is anonymous',
    example: 'session_abcd123',
  })
  @IsString()
  @IsOptional()
  sessionId?: string;
}
