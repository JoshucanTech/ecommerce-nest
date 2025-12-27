import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdPlatformsService } from './ad-platforms.service';
import { CreateAdPlatformConfigDto } from './dto/create-ad-platform-config.dto';
import { UpdateAdPlatformConfigDto } from './dto/update-ad-platform-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('ad-platform-configs')
@Controller('ad-platform-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdPlatformConfigsController {
  constructor(private readonly adPlatformsService: AdPlatformsService) {}

  @Post()
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Create a new ad platform configuration' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The ad platform configuration has been successfully created.',
  })
  create(
    @Body() createAdPlatformConfigDto: CreateAdPlatformConfigDto,
    @CurrentUser() user,
  ) {
    return this.adPlatformsService.create(createAdPlatformConfigDto, user);
  }

  @Get('advertisement/:advertisementId')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({
    summary: 'Get all platform configurations for an advertisement',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return all platform configurations for the advertisement.',
  })
  @ApiParam({ name: 'advertisementId', description: 'Advertisement ID' })
  findAllForAdvertisement(
    @Param('advertisementId') advertisementId: string,
    @CurrentUser() user,
  ) {
    return this.adPlatformsService.findAllForAdvertisement(
      advertisementId,
      user,
    );
  }

  @Get(':id')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get ad platform configuration by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return the ad platform configuration.',
  })
  @ApiParam({ name: 'id', description: 'Ad Platform Configuration ID' })
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.adPlatformsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Update ad platform configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The ad platform configuration has been successfully updated.',
  })
  @ApiParam({ name: 'id', description: 'Ad Platform Configuration ID' })
  update(
    @Param('id') id: string,
    @Body() updateAdPlatformConfigDto: UpdateAdPlatformConfigDto,
    @CurrentUser() user,
  ) {
    return this.adPlatformsService.update(id, updateAdPlatformConfigDto, user);
  }

  @Delete(':id')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Delete ad platform configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The ad platform configuration has been successfully deleted.',
  })
  @ApiParam({ name: 'id', description: 'Ad Platform Configuration ID' })
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.adPlatformsService.remove(id, user);
  }

  @Post(':id/sync')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({
    summary: 'Sync ad platform configuration with external platform',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The ad platform configuration has been successfully synced.',
  })
  @ApiParam({ name: 'id', description: 'Ad Platform Configuration ID' })
  sync(@Param('id') id: string, @CurrentUser() user) {
    return this.adPlatformsService.syncWithPlatform(id, user);
  }
}
