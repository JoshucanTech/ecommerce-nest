import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UserTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9_refresh...',
  })
  @IsString()
  refreshToken: string;

  // @ApiProperty({
  //   description: "Access token",
  //   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9_access...",
  // })
  // @IsString()
  // accessToken: string;
}
