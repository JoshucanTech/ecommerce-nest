import { Controller, Get, Query, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger"
import { AdvertisementsService } from "./advertisements.service"
import { Public } from "src/auth/decorators/public.decorator"

@ApiTags("featured-products")
@Controller("featured-products")
export class FeaturedProductsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  @Get()
  @ApiOperation({ summary: "Get all featured products" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return all featured products.",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "categoryId", required: false, type: String })
  @Public()
  findAll(@Query('page') page = 1, @Query('limit') limit = 10, @Query('categoryId') categoryId?: string) {
    return this.advertisementsService.getFeaturedProducts({
      page: +page,
      limit: +limit,
      categoryId,
    })
  }
}
