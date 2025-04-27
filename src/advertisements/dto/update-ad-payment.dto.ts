import { PartialType } from "@nestjs/swagger"
import { CreateAdPaymentDto } from "./create-ad-payment.dto"

export class UpdateAdPaymentDto extends PartialType(CreateAdPaymentDto) {}
