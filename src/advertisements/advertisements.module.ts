import { Module } from "@nestjs/common"
import { AdvertisementsController } from "./advertisements.controller"
import { AdvertisementsService } from "./advertisements.service"
import { PrismaModule } from "../prisma/prisma.module"
import { AdPlatformsService } from "./ad-platforms.service"
import { AdAnalyticsService } from "./ad-analytics.service"
import { AdPaymentsService } from "./ad-payments.service"
import { AdTargetingService } from "./ad-targeting.service"
import { AdPlatformConfigsController } from "./ad-platform-configs.controller"
import { AdAnalyticsController } from "./ad-analytics.controller"
import { AdPaymentsController } from "./ad-payments.controller"
import { AdTargetingController } from "./ad-targeting.controller"
import { FacebookAdService } from "./platforms/facebook-ad.service"
import { InstagramAdService } from "./platforms/instagram-ad.service"
import { TwitterAdService } from "./platforms/twitter-ad.service"
import { GoogleAdsenseService as GoogleAdSenseService } from "./platforms/google-adsense.service"
import { WhatsappAdService } from "./platforms/whatsapp-ad.service"
import { InAppAdService } from "./platforms/in-app-ad.service"
import { FeaturedProductsController } from "./featured-products.controller"

@Module({
  imports: [PrismaModule],
  controllers: [
    AdvertisementsController,
    AdPlatformConfigsController,
    AdAnalyticsController,
    AdPaymentsController,
    AdTargetingController,
    FeaturedProductsController,
  ],
  providers: [
    AdvertisementsService,
    AdPlatformsService,
    AdAnalyticsService,
    AdPaymentsService,
    AdTargetingService,
    FacebookAdService,
    InstagramAdService,
    TwitterAdService,
    GoogleAdSenseService,
    WhatsappAdService,
    InAppAdService,
  ],
  exports: [AdvertisementsService, WhatsappAdService, AdPlatformsService, AdAnalyticsService, AdPaymentsService, AdTargetingService],
})
export class AdvertisementsModule {}
