import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaymentStatus } from "@prisma/client";

export class UpdatePaymentStatusDto {
  @ApiProperty({
    description: "Payment status",
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: "Payment reference",
    example: "TXN123456789",
  })
  @IsOptional()
  @IsString()
  reference?: string;
}
