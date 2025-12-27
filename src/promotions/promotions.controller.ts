import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { ApplyPromoDto } from './dto/apply-promo.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('promotions')
@Controller('promotions')
@UseGuards(JwtAuthGuard)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply a promotion code' })
  @ApiResponse({
    status: 200,
    description: 'Promotion code applied successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Promotion code not found.' })
  applyPromo(@Body() applyPromoDto: ApplyPromoDto) {
    return this.promotionsService.apply(applyPromoDto.code);
  }
}
