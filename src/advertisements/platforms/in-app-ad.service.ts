import { Injectable, Logger } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { ConfigService } from "@nestjs/config"

@Injectable()
export class InAppAdService {
  private readonly logger = new Logger(InAppAdService.name)

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createInAppAd(advertisementId: string, adData: any) {
    try {
      this.logger.log(`Creating In-App ad for advertisement ID: ${advertisementId}`)

      // Get the advertisement details
      const advertisement = await this.prisma.advertisement.findUnique({
        where: { id: advertisementId },
        include: {
          targeting: true,
        },
      })

      if (!advertisement) {
        throw new Error(`Advertisement with ID ${advertisementId} not found`)
      }

      // Generate in-app ad ID
      const inAppAdId = `inapp_${Date.now()}_${Math.floor(Math.random() * 1000)}`

      // Store the ad reference
      await this.prisma.adPlatformReference.create({
        data: {
          advertisementId,
          platform: "IN_APP",
          externalId: inAppAdId,
          status: "ACTIVE",
          metadata: {
            placementType: adData.placementType || "BANNER",
            position: adData.position || "TOP",
            priority: adData.priority || "NORMAL",
            pages: adData.pages || ["HOME", "PRODUCT_LISTING"],
          },
        },
      })

      return {
        success: true,
        platform: "IN_APP",
        externalId: inAppAdId,
        status: "ACTIVE",
      }
    } catch (error) {
      this.logger.error(`Error creating In-App ad: ${error.message}`, error.stack)
      throw error
    }
  }

  async updateInAppAd(advertisementId: string, adData: any) {
    try {
      this.logger.log(`Updating In-App ad for advertisement ID: ${advertisementId}`)

      // Get the platform reference
      const platformRef = await this.prisma.adPlatformReference.findFirst({
        where: {
          advertisementId,
          platform: "IN_APP",
        },
      })

      if (!platformRef) {
        throw new Error(`In-App ad reference for advertisement ID ${advertisementId} not found`)
      }

      // Update the platform reference
      await this.prisma.adPlatformReference.update({
        where: { id: platformRef.id },
        data: {
          status: adData.status || platformRef.status,
          metadata: {
            ...platformRef.metadata as Record<string, any>,
            ...adData.metadata,
            lastUpdated: new Date().toISOString(),
          },
        },
      })

      return {
        success: true,
        platform: "IN_APP",
        externalId: platformRef.externalId,
        status: adData.status || platformRef.status,
      }
    } catch (error) {
      this.logger.error(`Error updating In-App ad: ${error.message}`, error.stack)
      throw error
    }
  }

  async deleteInAppAd(advertisementId: string) {
    try {
      this.logger.log(`Deleting In-App ad for advertisement ID: ${advertisementId}`)

      // Get the platform reference
      const platformRef = await this.prisma.adPlatformReference.findFirst({
        where: {
          advertisementId,
          platform: "IN_APP",
        },
      })

      if (!platformRef) {
        throw new Error(`In-App ad reference for advertisement ID ${advertisementId} not found`)
      }

      // Update the platform reference to DELETED status
      await this.prisma.adPlatformReference.update({
        where: { id: platformRef.id },
        data: {
          status: "DELETED",
          metadata: {
            ...platformRef.metadata as Record<string, any>,
            deletedAt: new Date().toISOString(),
          },
        },
      })

      return {
        success: true,
        platform: "IN_APP",
        externalId: platformRef.externalId,
        status: "DELETED",
      }
    } catch (error) {
      this.logger.error(`Error deleting In-App ad: ${error.message}`, error.stack)
      throw error
    }
  }

  async getInAppAdStats(advertisementId: string) {
    try {
      this.logger.log(`Getting In-App ad stats for advertisement ID: ${advertisementId}`)

      // Get the platform reference
      const platformRef = await this.prisma.adPlatformReference.findFirst({
        where: {
          advertisementId,
          platform: "IN_APP",
        },
      })

      if (!platformRef) {
        throw new Error(`In-App ad reference for advertisement ID ${advertisementId} not found`)
      }

      // Get analytics data from database
      const analytics = await this.prisma.adAnalytics.findMany({
        where: {
          advertisementId,
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 30, // Last 30 days
      })

      // Calculate totals
      const impressions = analytics.reduce((sum, record) => sum + record.views, 0)
      const clicks = analytics.reduce((sum, record) => sum + record.clicks, 0)
      const conversions = analytics.reduce((sum, record) => sum + record.conversions, 0)

      // Calculate rates
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0

      // Get daily breakdown
      const dailyStats = analytics.map((record) => ({
        date: record.timestamp.toISOString().split("T")[0],
        impressions: record.views,
        clicks: record.clicks,
        conversions: record.conversions,
        ctr: record.views > 0 ? (record.clicks / record.views) * 100 : 0,
        conversionRate: record.clicks > 0 ? (record.conversions / record.clicks) * 100 : 0,
      }))

      return {
        platform: "IN_APP",
        externalId: platformRef.externalId,
        stats: {
          impressions,
          clicks,
          conversions,
          ctr: Number.parseFloat(ctr.toFixed(2)),
          conversionRate: Number.parseFloat(conversionRate.toFixed(2)),
          dailyStats,
          placementPerformance: {
            banner: {
              impressions: Math.floor(impressions * 0.6),
              clicks: Math.floor(clicks * 0.5),
              ctr: Number.parseFloat(((Math.floor(clicks * 0.5) / Math.floor(impressions * 0.6)) * 100).toFixed(2)),
            },
            interstitial: {
              impressions: Math.floor(impressions * 0.3),
              clicks: Math.floor(clicks * 0.4),
              ctr: Number.parseFloat(((Math.floor(clicks * 0.4) / Math.floor(impressions * 0.3)) * 100).toFixed(2)),
            },
            native: {
              impressions: Math.floor(impressions * 0.1),
              clicks: Math.floor(clicks * 0.1),
              ctr: Number.parseFloat(((Math.floor(clicks * 0.1) / Math.floor(impressions * 0.1)) * 100).toFixed(2)),
            },
          },
        },
      }
    } catch (error) {
      this.logger.error(`Error getting In-App ad stats: ${error.message}`, error.stack)
      throw error
    }
  }

  async getRelevantAdsForPage(page: string, userId?: string, limit = 5) {
    try {
      this.logger.log(`Getting relevant In-App ads for page: ${page}`)

      // Get all active in-app ads
      const platformRefs = await this.prisma.adPlatformReference.findMany({
        where: {
          platform: "IN_APP",
          status: "ACTIVE",
        },
        include: {
          advertisement: {
            include: {
              targeting: true,
            },
          },
        },
      })

      // Filter ads that are configured for this page
      const pageAds = platformRefs.filter((ref) => {
        const metadata = ref.metadata as any
        return metadata.pages && metadata.pages.includes(page)
      })

      // If user is provided, filter by targeting criteria
      let relevantAds = pageAds

      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: {
            profile: true,
          },
        })

        if (user) {
          relevantAds = pageAds.filter((ref) => {
            const targeting = ref.advertisement.targeting

            if (!targeting) {
              return true // No targeting means ad is for everyone
            }

            // Check age targeting
            if (targeting.minAge || targeting.maxAge) {
              const userAge = this.calculateAge(user.profile?.dateOfBirth)

              if (targeting.minAge && userAge < targeting.minAge) {
                return false
              }

              if (targeting.maxAge && userAge > targeting.maxAge) {
                return false
              }
            }

            // Check gender targeting
            if (targeting.genders && targeting.genders.length > 0) {
              if (!targeting.genders.includes(user.profile?.gender)) {
                return false
              }
            }

            // Check location targeting
            if (targeting.locations && targeting.locations.length > 0) {
              const userLocation = user.profile?.location || ""
              const locationMatches = targeting.locations.some((location) =>
                userLocation.toLowerCase().includes(location.toLowerCase()),
              )

              if (!locationMatches) {
                return false
              }
            }

            // Check interest targeting
            if (targeting.interests && targeting.interests.length > 0) {
              const userInterests = user.profile?.interests || []
              const hasMatchingInterest = targeting.interests.some((interest) => userInterests.includes(interest))

              if (!hasMatchingInterest) {
                return false
              }
            }

            return true
          })
        }
      }

      // Sort by priority
      relevantAds.sort((a, b) => {
        const aPriority = (a.metadata as any).priority || "NORMAL"
        const bPriority = (b.metadata as any).priority || "NORMAL"

        const priorityValues = {
          HIGH: 3,
          NORMAL: 2,
          LOW: 1,
        }

        return priorityValues[bPriority] - priorityValues[aPriority]
      })

      // Return the top ads based on limit
      return relevantAds.slice(0, limit).map((ref) => ({
        id: ref.advertisement.id,
        title: ref.advertisement.title,
        description: ref.advertisement.description,
        imageUrl: ref.advertisement.imageUrl,
        targetUrl: ref.advertisement.targetUrl,
        type: ref.advertisement.type,
        placementType: (ref.metadata as any).placementType,
        position: (ref.metadata as any).position,
      }))
    } catch (error) {
      this.logger.error(`Error getting relevant In-App ads: ${error.message}`, error.stack)
      throw error
    }
  }

  async syncAd(advertisementId: string) {
    try {
      this.logger.log(`Syncing In-App ad for advertisement ID: ${advertisementId}`)

      // Get the platform reference
      const platformRef = await this.prisma.adPlatformReference.findFirst({
        where: {
          advertisementId,
          platform: "IN_APP",
        },
      })

      if (!platformRef) {
        throw new Error(`In-App ad reference for advertisement ID ${advertisementId} not found`)
      }

      // Get the advertisement details
      const advertisement = await this.prisma.advertisement.findUnique({
        where: { id: advertisementId },
      })

      if (!advertisement) {
        throw new Error(`Advertisement with ID ${advertisementId} not found`)
      }

      // Simulate fetching updated data for in-app ad
      const updatedStatus = Math.random() > 0.9 ? "PAUSED" : "ACTIVE" // Occasionally show as paused
      const metadata = platformRef.metadata as Record<string, any>;
      const updatedMetadata = {
        ...metadata,
        lastSynced: new Date().toISOString(),
        priority: metadata.priority || "NORMAL",
        pages: metadata.pages || ["HOME", "PRODUCT_LISTING"],
        impressions: Math.floor(Math.random() * 30000) + 5000,
        clicks: Math.floor((Math.random() * 0.05 + 0.01) * (Math.floor(Math.random() * 30000) + 5000)), // 1-6% CTR
      }

      // Update the platform reference with the latest data
      await this.prisma.adPlatformReference.update({
        where: { id: platformRef.id },
        data: {
          status: updatedStatus,
          metadata: updatedMetadata,
        },
      })

      // Fetch the latest stats
      const stats = await this.getInAppAdStats(advertisementId)

      return {
        success: true,
        platform: "IN_APP",
        externalId: platformRef.externalId,
        status: updatedStatus,
        metadata: updatedMetadata,
        stats: stats.stats,
      }
    } catch (error) {
      this.logger.error(`Error syncing In-App ad: ${error.message}`, error.stack)
      throw error
    }
  }

  private calculateAge(dateOfBirth: Date | undefined): number {
    if (!dateOfBirth) return 0

    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }
}
