// backend/src/payments/dto/update-payment.dto.ts
import { ApiProperty, PartialType } from "@nestjs/swagger";
import { CreatePaymentDto } from "./create-payment.dto";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaymentStatus } from "@prisma/client";

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @ApiProperty({
    description: "Payment status",
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiProperty({
    description: "Transaction reference from payment provider",
    required: false,
  })
  @IsString()
  @IsOptional()
  transactionReference?: string;
}
