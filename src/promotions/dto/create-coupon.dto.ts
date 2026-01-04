import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDateString, IsBoolean, Min } from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minPurchase?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscount?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  usageLimit?: number;

  @IsString()
  @IsOptional()
  vendorId?: string;
}
