import { Controller, Get, Patch, Body, Param, UseGuards, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from "@nestjs/swagger"
import { AdTargetingService } from "./ad-targeting.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { CurrentUser } from "../auth/decorators/current-user.decorator"
import { CreateAdTargetingDto } from "./dto/create-advertisement.dto"

@ApiTags("ad-targeting")
@Controller("ad-targeting")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdTargetingController {
  constructor(private readonly adTargetingService: AdTargetingService) {}

  @Get("advertisement/:advertisementId")
  @Roles("VENDOR", "ADMIN")
  @ApiOperation({ summary: "Get targeting for an advertisement" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return targeting for the advertisement.",
  })
  @ApiParam({ name: "advertisementId", description: "Advertisement ID" })
  findOne(@Param('advertisementId') advertisementId: string, @CurrentUser() user) {
    // return this.adTargetingService.getTargeting(advertisementId, user)
    return this.adTargetingService.getTargeting(advertisementId)
  }

  @Patch('advertisement/:advertisementId')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Update targeting for an advertisement' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The targeting has been successfully updated.",
  })
  @ApiParam({ name: "advertisementId", description: "Advertisement ID" })
  update(
    @Param('advertisementId') advertisementId: string,
    @Body() updateAdTargetingDto: CreateAdTargetingDto,
    @CurrentUser() user,
  ) {
    // return this.adTargetingService.updateTargeting(advertisementId, updateAdTargetingDto, user)
    return this.adTargetingService.updateTargeting(advertisementId, updateAdTargetingDto)
  }
}
