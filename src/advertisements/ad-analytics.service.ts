import { Injectable } from "@nestjs/common"
import type { PrismaService } from "../prisma/prisma.service"
import type { AdAnalyticsQueryDto } from "./dto/ad-analytics-query.dto"

@Injectable()
export class AdAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAdAnalytics(user, query: AdAnalyticsQueryDto) {
    // const { startDate, endDate, metrics = ["views", "clicks", "conversions"] } = query
    const { startDate, endDate, advertisementId } = query

    // Get analytics for the specified ad
    const analytics = await this.prisma.adAnalytics.findMany({
      where: {
        advertisementId,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      orderBy: {
        date: "asc",
      },
    })

    // Calculate aggregated metrics
    const aggregatedMetrics = {
      totalViews: 0,
      totalClicks: 0,
      totalConversions: 0,
      clickThroughRate: 0,
      conversionRate: 0,
    }

    analytics.forEach((record) => {
      aggregatedMetrics.totalViews += record.views
      aggregatedMetrics.totalClicks += record.clicks
      aggregatedMetrics.totalConversions += record.conversions
    })

    // Calculate rates
    if (aggregatedMetrics.totalViews > 0) {
      aggregatedMetrics.clickThroughRate = (aggregatedMetrics.totalClicks / aggregatedMetrics.totalViews) * 100
    }

    if (aggregatedMetrics.totalClicks > 0) {
      aggregatedMetrics.conversionRate = (aggregatedMetrics.totalConversions / aggregatedMetrics.totalClicks) * 100
    }

    // Format data for time series if needed
    const timeSeriesData = analytics.map((record) => ({
      timestamp: record.date,
      views: record.views,
      clicks: record.clicks,
      conversions: record.conversions,
      clickThroughRate: record.views > 0 ? (record.clicks / record.views) * 100 : 0,
      conversionRate: record.clicks > 0 ? (record.conversions / record.clicks) * 100 : 0,
    }))

    return {
      aggregatedMetrics,
      timeSeriesData,
    }
  }

  async getVendorAnalytics(vendorId: string, query: AdAnalyticsQueryDto) {
    const { startDate, endDate } = query

    // Get all ads for the vendor
    const ads = await this.prisma.advertisement.findMany({
      where: {
        vendorId,
      },
      select: {
        id: true,
      },
    })

    const adIds = ads.map((ad) => ad.id)

    // Get analytics for all vendor ads
    const analytics = await this.prisma.adAnalytics.findMany({
      where: {
        advertisementId: {
          in: adIds,
        },
        timestamp: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      include: {
        advertisement: {
          select: {
            title: true,
            type: true,
          },
        },
      },
    })

    // Aggregate by ad
    const adPerformance = {}
    analytics.forEach((record) => {
      if (!adPerformance[record.advertisementId]) {
        adPerformance[record.advertisementId] = {
          adId: record.advertisementId,
          adTitle: record.advertisement.title,
          adType: record.advertisement.type,
          totalViews: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalSpend: 0,
        }
      }

      adPerformance[record.advertisementId].totalViews += record.views
      adPerformance[record.advertisementId].totalClicks += record.clicks
      adPerformance[record.advertisementId].totalConversions += record.conversions
    })

    // Get payment data to calculate spend
    const payments = await this.prisma.adPayment.findMany({
      where: {
        advertisementId: {
          in: adIds,
        },
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
    })

    payments.forEach((payment) => {
      if (adPerformance[payment.advertisementId]) {
        adPerformance[payment.advertisementId].totalSpend += payment.amount
      }
    })

    // Calculate overall performance
    const overallPerformance = {
      totalViews: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalSpend: 0,
      clickThroughRate: 0,
      conversionRate: 0,
      costPerClick: 0,
      costPerConversion: 0,
    }

    Object.values(adPerformance).forEach((ad: any) => {
      overallPerformance.totalViews += ad.totalViews
      overallPerformance.totalClicks += ad.totalClicks
      overallPerformance.totalConversions += ad.totalConversions
      overallPerformance.totalSpend += ad.totalSpend
    })

    // Calculate rates
    if (overallPerformance.totalViews > 0) {
      overallPerformance.clickThroughRate = (overallPerformance.totalClicks / overallPerformance.totalViews) * 100
    }

    if (overallPerformance.totalClicks > 0) {
      overallPerformance.conversionRate = (overallPerformance.totalConversions / overallPerformance.totalClicks) * 100
      overallPerformance.costPerClick = overallPerformance.totalSpend / overallPerformance.totalClicks
    }

    if (overallPerformance.totalConversions > 0) {
      overallPerformance.costPerConversion = overallPerformance.totalSpend / overallPerformance.totalConversions
    }

    return {
      overallPerformance,
      adPerformance: Object.values(adPerformance),
    }
  }

  async recordAdView(adId: string, userId?: string, platform: any) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find or create today's analytics record
    const analyticsRecord = await this.prisma.adAnalytics.upsert({
      where: {
        advertisementId_date_platform: {
          advertisementId: adId,
          date: today,
          platform,
        },
      },
      update: {
        views: {
          increment: 1,
        },
      },
      create: {
        advertisementId: adId,
        date: today,
        timestamp: new Date(),
        views: 1,
        clicks: 0,
        conversions: 0,
      },
    })

    // Record user view if user is provided
    if (userId) {
      await this.prisma.adUserInteraction.create({
        data: {
          advertisementId: adId,
          userId,
          interactionType: "VIEW",
          timestamp: new Date(),
        },
      })
    }

    return analyticsRecord
  }

  async recordAdClick(adId: string, platform, userId?: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find or create today's analytics record
    const analyticsRecord = await this.prisma.adAnalytics.upsert({
      where: {
        advertisementId_date_platform: {
          advertisementId: adId,
          date: today,
          platform,
        },
      },
      update: {
        clicks: {
          increment: 1,
        },
      },
      create: {
        advertisementId: adId,
        date: today,
        timestamp: new Date(),
        views: 0,
        clicks: 1,
        conversions: 0,
      },
    })

    // Record user click if user is provided
    if (userId) {
      await this.prisma.adUserInteraction.create({
        data: {
          advertisementId: adId,
          userId,
          interactionType: "CLICK",
          timestamp: new Date(),
        },
      })
    }

    return analyticsRecord
  }

  async recordAdConversion(adId: string, userId?: string, conversionValue?: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find or create today's analytics record
    const analyticsRecord = await this.prisma.adAnalytics.upsert({
      where: {
        advertisementId_date: {
          advertisementId: adId,
          date: today,
        },
      },
      update: {
        conversions: {
          increment: 1,
        },
        conversionValue: {
          increment: conversionValue || 0,
        },
      },
      create: {
        advertisementId: adId,
        date: today,
        timestamp: new Date(),
        views: 0,
        clicks: 0,
        conversions: 1,
        conversionValue: conversionValue || 0,
      },
    })

    // Record user conversion if user is provided
    if (userId) {
      await this.prisma.adUserInteraction.create({
        data: {
          advertisementId: adId,
          userId,
          interactionType: "CONVERSION",
          timestamp: new Date(),
          conversionValue,
        },
      })
    }

    return analyticsRecord
  }

  async getDashboardAnalytics(vendorId: string) {
    // Get date range for last 30 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    // Get all ads for the vendor
    const ads = await this.prisma.advertisement.findMany({
      where: {
        vendorId,
      },
      select: {
        id: true,
      },
    })

    const adIds = ads.map((ad) => ad.id)

    // Get analytics for the last 30 days
    const analytics = await this.prisma.adAnalytics.findMany({
      where: {
        advertisementId: {
          in: adIds,
        },
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Get payments for the last 30 days
    const payments = await this.prisma.adPayment.findMany({
      where: {
        advertisementId: {
          in: adIds,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Calculate metrics
    const totalViews = analytics.reduce((sum, record) => sum + record.views, 0)
    const totalClicks = analytics.reduce((sum, record) => sum + record.clicks, 0)
    const totalConversions = analytics.reduce((sum, record) => sum + record.conversions, 0)
    const totalSpend = payments.reduce((sum, payment) => sum + payment.amount, 0)

    // Calculate daily metrics for charts
    const dailyMetrics = {}

    // Initialize daily metrics for each day in the range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      dailyMetrics[dateStr] = {
        date: dateStr,
        views: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
      }
    }

    // Populate with actual data
    analytics.forEach((record) => {
      const dateStr = record.timestamp.toISOString().split("T")[0]
      if (dailyMetrics[dateStr]) {
        dailyMetrics[dateStr].views += record.views
        dailyMetrics[dateStr].clicks += record.clicks
        dailyMetrics[dateStr].conversions += record.conversions
      }
    })

    payments.forEach((payment) => {
      const dateStr = payment.createdAt.toISOString().split("T")[0]
      if (dailyMetrics[dateStr]) {
        dailyMetrics[dateStr].spend += payment.amount
      }
    })

    return {
      summary: {
        totalViews,
        totalClicks,
        totalConversions,
        totalSpend,
        clickThroughRate: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        costPerClick: totalClicks > 0 ? totalSpend / totalClicks : 0,
        costPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
      },
      dailyMetrics: Object.values(dailyMetrics),
    }
  }
}
