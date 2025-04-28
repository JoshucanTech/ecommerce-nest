import { Controller, Get, Post, Body, UseGuards, Query, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import { AdAnalyticsService } from "./ad-analytics.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { CurrentUser } from "../auth/decorators/current-user.decorator"
import { AdAnalyticsQueryDto } from "./dto/ad-analytics-query.dto"

@ApiTags("ad-analytics")
@Controller("ad-analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdAnalyticsController {
  constructor(private readonly adAnalyticsService: AdAnalyticsService) {}

  @Get()
  @Roles("VENDOR", "ADMIN")
  @ApiOperation({ summary: "Get analytics for an advertisement" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return analytics for the advertisement.",
  })
  getAnalytics(@Query() query: AdAnalyticsQueryDto, @CurrentUser() user) {
    return this.adAnalyticsService.getAdAnalytics(user, query )
  }

  @Post('track-impression')
  @ApiOperation({ summary: 'Track an ad Views/impression' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The Views/impression has been successfully tracked.',
  })
  trackImpression(
    @Body() data: { advertisementId: string; platform: string },
    @CurrentUser() user
  ) {
    return this.adAnalyticsService.recordAdView(data.platform, data.advertisementId, user?.id);
  }

  @Post('track-click')
  @ApiOperation({ summary: 'Track an ad click' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The click has been successfully tracked.',
  })
  trackClick(
    @Body() data: { advertisementId: string; platform: string },
  ) {
    return this.adAnalyticsService.recordAdClick(data.advertisementId, data.platform);
  }

  @Post('track-conversion')
  @ApiOperation({ summary: 'Track an ad conversion' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The conversion has been successfully tracked.',
  })
  trackConversion(
    @Body() data: { advertisementId: string; platform: string },
  ) {
    return this.adAnalyticsService.recordAdConversion(data.advertisementId, data.platform);
  }

  @Get('dashboard')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get analytics dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return analytics dashboard data.',
  })
  getDashboard(@CurrentUser() user) {
    return this.adAnalyticsService.getDashboardAnalytics(user);
  }
}
