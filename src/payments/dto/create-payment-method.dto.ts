import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({
    example: 'pm_1234567890',
    description: 'Stripe payment method ID',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @ApiProperty({
    example: true,
    description: 'Set as default payment method',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
