import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsString, IsEnum, IsNumber, IsUUID, Min, IsOptional } from "class-validator"
import { PaymentMethod, PaymentStatus } from "@prisma/client"

export class CreateAdPaymentDto {
  @ApiProperty({ example: "advertisement-uuid" })
  @IsUUID()
  advertisementId: string

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  amount: number

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CREDIT_CARD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus

  @ApiPropertyOptional({ example: "transaction-id-123" })
  @IsOptional()
  @IsString()
  transactionId?: string

  @ApiPropertyOptional({ example: "USD" })
  @IsOptional()
  @IsString()
  currency?: string
}
