import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdPlatformConfigDto } from './dto/create-ad-platform-config.dto';
import { UpdateAdPlatformConfigDto } from './dto/update-ad-platform-config.dto';
import { AdPlatform, UserRole } from '@prisma/client';
import { FacebookAdService } from './platforms/facebook-ad.service';
import { InstagramAdService } from './platforms/instagram-ad.service';
import { TwitterAdService } from './platforms/twitter-ad.service';
import { GoogleAdsenseService as GoogleAdSenseService } from './platforms/google-adsense.service';
import { WhatsappAdService } from './platforms/whatsapp-ad.service';
import { InAppAdService } from './platforms/in-app-ad.service';

@Injectable()
export class AdPlatformsService {
  constructor(
    private prisma: PrismaService,
    private facebookAdService: FacebookAdService,
    private instagramAdService: InstagramAdService,
    private twitterAdService: TwitterAdService,
    private googleAdSenseService: GoogleAdSenseService,
    private whatsappAdService: WhatsappAdService,
    private inAppAdService: InAppAdService,
  ) {}

  async create(
    createAdPlatformConfigDto: CreateAdPlatformConfigDto,
    user: any,
  ) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id: createAdPlatformConfigDto.advertisementId },
    });

    if (!advertisement) {
      throw new NotFoundException(
        `Advertisement with ID ${createAdPlatformConfigDto.advertisementId} not found`,
      );
    }

    // Check if user is authorized to create platform config for this advertisement
    if (
      user.role !== UserRole.ADMIN &&
      advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to create platform config for this advertisement',
      );
    }

    // Check if platform config already exists for this advertisement and platform
    const existingConfig = await this.prisma.adPlatformConfig.findFirst({
      where: {
        advertisementId: createAdPlatformConfigDto.advertisementId,
        platform: createAdPlatformConfigDto.platform,
      },
    });

    if (existingConfig) {
      throw new BadRequestException(
        `Platform config already exists for this advertisement and platform`,
      );
    }

    // Create platform config
    const platformConfig = await this.prisma.adPlatformConfig.create({
      data: {
        ...createAdPlatformConfigDto,
      },
    });

    return platformConfig;
  }

  async findAllForAdvertisement(advertisementId: string, user: any) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id: advertisementId },
    });

    if (!advertisement) {
      throw new NotFoundException(
        `Advertisement with ID ${advertisementId} not found`,
      );
    }

    // Check if user is authorized to view platform configs for this advertisement
    if (
      user.role !== UserRole.ADMIN &&
      advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to view platform configs for this advertisement',
      );
    }

    // Get platform configs
    const platformConfigs = await this.prisma.adPlatformConfig.findMany({
      where: { advertisementId },
    });

    return platformConfigs;
  }

  async findOne(id: string, user: any) {
    const platformConfig = await this.prisma.adPlatformConfig.findUnique({
      where: { id },
      include: {
        advertisement: {
          select: {
            id: true,
            title: true,
            vendorId: true,
          },
        },
      },
    });

    if (!platformConfig) {
      throw new NotFoundException(`Platform config with ID ${id} not found`);
    }

    // Check if user is authorized to view this platform config
    if (
      user.role !== UserRole.ADMIN &&
      platformConfig.advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to view this platform config',
      );
    }

    return platformConfig;
  }

  async update(
    id: string,
    updateAdPlatformConfigDto: UpdateAdPlatformConfigDto,
    user: any,
  ) {
    // Check if platform config exists
    const platformConfig = await this.prisma.adPlatformConfig.findUnique({
      where: { id },
      include: {
        advertisement: {
          select: {
            id: true,
            vendorId: true,
          },
        },
      },
    });

    if (!platformConfig) {
      throw new NotFoundException(`Platform config with ID ${id} not found`);
    }

    // Check if user is authorized to update this platform config
    if (
      user.role !== UserRole.ADMIN &&
      platformConfig.advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to update this platform config',
      );
    }

    // Update platform config
    const updatedConfig = await this.prisma.adPlatformConfig.update({
      where: { id },
      data: updateAdPlatformConfigDto,
    });

    return updatedConfig;
  }

  async remove(id: string, user: any) {
    // Check if platform config exists
    const platformConfig = await this.prisma.adPlatformConfig.findUnique({
      where: { id },
      include: {
        advertisement: {
          select: {
            id: true,
            vendorId: true,
          },
        },
      },
    });

    if (!platformConfig) {
      throw new NotFoundException(`Platform config with ID ${id} not found`);
    }

    // Check if user is authorized to delete this platform config
    if (
      user.role !== UserRole.ADMIN &&
      platformConfig.advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to delete this platform config',
      );
    }

    // Delete platform config
    await this.prisma.adPlatformConfig.delete({
      where: { id },
    });

    return { message: 'Platform config deleted successfully' };
  }

  async syncWithPlatform(id: string, user: any) {
    // Check if platform config exists
    const platformConfig = await this.prisma.adPlatformConfig.findUnique({
      where: { id },
      include: {
        advertisement: {
          select: {
            id: true,
            vendorId: true,
            title: true,
            mediaUrls: true,
            adText: true,
            callToAction: true,
            landingPageUrl: true,
            targeting: true,
          },
        },
      },
    });

    if (!platformConfig) {
      throw new NotFoundException(`Platform config with ID ${id} not found`);
    }

    // Check if user is authorized to sync this platform config
    if (
      user.role !== UserRole.ADMIN &&
      platformConfig.advertisement.vendorId !== user.vendorId
    ) {
      throw new ForbiddenException(
        'You are not authorized to sync this platform config',
      );
    }

    // Sync with platform
    let result;
    switch (platformConfig.platform) {
      case AdPlatform.FACEBOOK:
        result = await this.facebookAdService.syncAd(
          platformConfig.advertisementId,
        );
        break;
      case AdPlatform.INSTAGRAM:
        result = await this.instagramAdService.syncAd(
          platformConfig.advertisementId,
        );
        break;
      case AdPlatform.TWITTER:
        result = await this.twitterAdService.syncAd(
          platformConfig.advertisementId,
        );
        break;
      case AdPlatform.GOOGLE_ADSENSE:
        result = await this.googleAdSenseService.syncAd(
          platformConfig.advertisementId,
        );
        break;
      case AdPlatform.WHATSAPP:
        result = await this.whatsappAdService.syncAd(
          platformConfig.advertisementId,
        );
        break;
      case AdPlatform.IN_APP:
        result = await this.inAppAdService.syncAd(
          platformConfig.advertisementId,
        );
        break;
      default:
        throw new BadRequestException(
          `Unsupported platform: ${platformConfig.platform}`,
        );
    }

    // Update platform config with result
    const updatedConfig = await this.prisma.adPlatformConfig.update({
      where: { id },
      data: {
        platformAdId: result.platformAdId,
        platformCampaignId: result.platformCampaignId,
        platformStatus: result.platformStatus,
        settings: result.settings,
      },
    });

    return updatedConfig;
  }
}
