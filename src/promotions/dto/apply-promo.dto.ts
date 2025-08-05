import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class ApplyPromoDto {
  @ApiProperty({
    description: "The promo code to apply",
    example: "SUMMER20",
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
