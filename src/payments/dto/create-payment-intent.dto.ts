import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class CreatePaymentIntentDto {
  @ApiProperty({
    example: 100.5,
    description: "Amount to charge",
  })
  @IsNumber()
  @Min(0.5)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    example: "USD",
    description: "Currency code",
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "Order ID",
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
