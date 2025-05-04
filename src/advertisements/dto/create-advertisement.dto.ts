import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  IsUrl,
  Min,
  Max,
  ValidateNested,
  IsUUID,
} from "class-validator"
import { Type } from "class-transformer"
import { AdType, PricingModel } from "@prisma/client"
// import { AdType, PricingModel } from "@prisma/client"


export class ProductAdvertisementDto {
  @ApiProperty({ example: "product-uuid" })
  @IsUUID()
  productId: string

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number

  @ApiPropertyOptional({ example: "Special Summer Edition" })
  @IsOptional()
  @IsString()
  customTitle?: string

  @ApiPropertyOptional({ example: "Limited time offer for our summer collection" })
  @IsOptional()
  @IsString()
  customDescription?: string

  @ApiPropertyOptional({ example: "https://example.com/custom-image.jpg" })
  @IsOptional()
  @IsUrl()
  customImageUrl?: string

  @ApiPropertyOptional({ example: 49.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number
}



export class CreateAdTargetingDto {
  @ApiPropertyOptional({ minimum: 13, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(13)
  @Max(100)
  ageMin?: number

  @ApiPropertyOptional({ minimum: 13, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(13)
  @Max(100)
  ageMax?: number

  @ApiPropertyOptional({ type: [String], example: ["MALE", "FEMALE", "OTHER"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genders?: string[]

  @ApiPropertyOptional({ type: [String], example: ["US", "UK", "New York", "London"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[]

  @ApiPropertyOptional({ type: [String], example: ["Sports", "Technology", "Fashion"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[]

  @ApiPropertyOptional({ type: [String], example: ["sale", "discount", "new arrival"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[]

  @ApiPropertyOptional({ type: [String], example: ["Mobile", "Desktop", "Tablet"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  devices?: string[]

  @ApiPropertyOptional({ type: [String], example: ["Chrome", "Firefox", "Safari"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  browsers?: string[]

  @ApiPropertyOptional({ type: Object, example: { facebookAudienceId: "123456789" } })
  @IsOptional()
  customAudience?: Record<string, any>
}

export class CreateAdvertisementDto {
  @ApiProperty({ example: "Summer Sale Promotion" })
  @IsString()
  title: string

  @ApiPropertyOptional({ example: "Promote our summer collection with special discounts" })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: "vendor-uuid" })
  @IsUUID()
  vendorId: string

  // @ApiPropertyOptional({ example: "product-uuid" })
  // @IsOptional()
  // @IsUUID()
  // productId?: string


  @ApiPropertyOptional({ example: 5, description: "Maximum number of products this ad can hold" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50) // Setting a reasonable upper limit
  maxProducts?: number

  @ApiPropertyOptional({ type: [ProductAdvertisementDto], description: "Products to include in this advertisement" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAdvertisementDto)
  products?: ProductAdvertisementDto[]


  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiProperty({ example: 1000, description: "Total budget for the ad campaign" })
  @IsNumber()
  @Min(1)
  budget: number

  @ApiPropertyOptional({ example: 100, description: "Daily budget limit" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  dailyBudget?: number

  @ApiProperty({ enum: PricingModel, example: PricingModel.CPC })
  @IsEnum(PricingModel)
  pricingModel: PricingModel

  @ApiProperty({ enum: AdType, example: AdType.FEATURED_PRODUCT, description: "Ad type" })
  @IsEnum(AdType)
  type: AdType 

  @ApiProperty({ example: 0.5, description: "Bid amount per click/view based on pricing model" })
  @IsNumber()
  @Min(0.01)
  bidAmount: number

  @ApiProperty({ type: [String], example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"] })
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls: string[]

  @ApiPropertyOptional({ example: "Get 50% off on all summer items!" })
  @IsOptional()
  @IsString()
  adText?: string

  @ApiPropertyOptional({ example: "Shop Now" })
  @IsOptional()
  @IsString()
  callToAction?: string

  @ApiPropertyOptional({ example: "https://example.com/summer-sale" })
  @IsOptional()
  @IsUrl()
  landingPageUrl?: string

  @ApiPropertyOptional({ type: CreateAdTargetingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAdTargetingDto)
  targeting?: CreateAdTargetingDto

  @ApiPropertyOptional({ type: [String], example: ["IN_APP", "FACEBOOK", "INSTAGRAM"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[]

 

}
