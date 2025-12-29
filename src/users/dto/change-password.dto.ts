import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @IsString()
    @ApiProperty({
        description: 'The current password of the user',
        example: 'OldPassword123!',
    })
    currentPassword: string;

    @IsString()
    @MinLength(8, { message: 'New password must be at least 8 characters long' })
    @ApiProperty({
        description: 'The new password for the account',
        example: 'NewPassword123!',
        minLength: 8,
    })
    newPassword: string;
}
