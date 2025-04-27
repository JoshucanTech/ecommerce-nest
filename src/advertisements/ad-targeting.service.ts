import { Injectable, NotFoundException } from "@nestjs/common"
import type { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class AdTargetingService {
  constructor(private prisma: PrismaService) {}

  async createTargeting(advertisementId: string, targetingData: any) {
    // Verify advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id: advertisementId },
    })

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${advertisementId} not found`)
    }

    // Create or update targeting data
    return this.prisma.adTargeting.upsert({
      where: {
        advertisementId,
      },
      update: {
        ...targetingData,
      },
      create: {
        advertisementId,
        ...targetingData,
      },
    })
  }

  async getTargeting(advertisementId: string) {
    const targeting = await this.prisma.adTargeting.findUnique({
      where: {
        advertisementId,
      },
    })

    if (!targeting) {
      throw new NotFoundException(`Targeting for advertisement ID ${advertisementId} not found`)
    }

    return targeting
  }

  async updateTargeting(advertisementId: string, targetingData: any) {
    // Verify targeting exists
    const targeting = await this.prisma.adTargeting.findUnique({
      where: {
        advertisementId,
      },
    })

    if (!targeting) {
      throw new NotFoundException(`Targeting for advertisement ID ${advertisementId} not found`)
    }

    return this.prisma.adTargeting.update({
      where: {
        advertisementId,
      },
      data: targetingData,
    })
  }

  async deleteTargeting(advertisementId: string) {
    // Verify targeting exists
    const targeting = await this.prisma.adTargeting.findUnique({
      where: {
        advertisementId,
      },
    })

    if (!targeting) {
      throw new NotFoundException(`Targeting for advertisement ID ${advertisementId} not found`)
    }

    return this.prisma.adTargeting.delete({
      where: {
        advertisementId,
      },
    })
  }

  async matchUserToAd(userId: string, adId: string) {
    // Get user data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    })

    if (!user) {
      return false
    }

    // Get ad targeting criteria
    const targeting = await this.prisma.adTargeting.findUnique({
      where: { advertisementId: adId },
    })

    if (!targeting) {
      // If no targeting is set, assume the ad is for everyone
      return true
    }

    // Match user against targeting criteria
    let matches = true

    // Age targeting
    if (targeting.ageMin || targeting.ageMax) {
      const userAge =  this.calculateAge(user.profile?.dateOfBirth)

      if (targeting.ageMin && userAge < targeting.ageMin) {
        matches = false
      }

      if (targeting.ageMax && userAge > targeting.ageMax) {
        matches = false
      }
    }

    // Gender targeting
    if (targeting.genders && targeting.genders.length > 0) {
      if (!targeting.genders.includes(user.profile?.gender)) {
        matches = false
      }
    }

    // Location targeting
    if (targeting.locations && targeting.locations.length > 0) {
      const userLocation = user.profile?.location || ""
      const locationMatches = targeting.locations.some((location) =>
        userLocation.toLowerCase().includes(location.toLowerCase()),
      )

      if (!locationMatches) {
        matches = false
      }
    }

    // Interest targeting
    if (targeting.interests && targeting.interests.length > 0) {
      const userInterests = user.profile?.interests || []
      const hasMatchingInterest = targeting.interests.some((interest) => userInterests.includes(interest))

      if (!hasMatchingInterest) {
        matches = false
      }
    }

    return matches
  }

  async getRelevantAdsForUser(userId: string, limit = 5) {
    // Get user data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    })

    if (!user) {
      return []
    }

    // Get all active ads
    const activeAds = await this.prisma.advertisement.findMany({
      where: {
        status: "ACTIVE",
        startDate: {
          lte: new Date(),
        },
        endDate: {
          gte: new Date(),
        },
      },
      include: {
        targeting: true,
      },
    })

    // Filter ads based on targeting criteria
    const relevantAds = []

    for (const ad of activeAds) {
      if (!ad.targeting) {
        // If no targeting is set, include the ad
        relevantAds.push(ad)
        continue
      }

      let matches = true
      const targeting = ad.targeting

      // Age targeting
      if (targeting.ageMin || targeting.ageMax) {
        const userAge =  this.calculateAge(user.profile?.dateOfBirth)

        if (targeting.ageMin && userAge < targeting.ageMin) {
          matches = false
        }

        if (targeting.ageMax && userAge > targeting.ageMax) {
          matches = false
        }
      }

      // Gender targeting
      if (targeting.genders && targeting.genders.length > 0) {
        if (!targeting.genders.includes(user.profile?.gender)) {
          matches = false
        }
      }

      // Location targeting
      if (targeting.locations && targeting.locations.length > 0) {
        const userLocation = user.profile?.location || ""
        const locationMatches = targeting.locations.some((location) =>
          userLocation.toLowerCase().includes(location.toLowerCase()),
        )

        if (!locationMatches) {
          matches = false
        }
      }

      // Interest targeting
      if (targeting.interests && targeting.interests.length > 0) {
        const userInterests = user.profile?.interests || []
        const hasMatchingInterest = targeting.interests.some((interest) => userInterests.includes(interest))

        if (!hasMatchingInterest) {
          matches = false
        }
      }

      if (matches) {
        relevantAds.push(ad)
      }
    }

    // Sort by relevance (could be enhanced with more sophisticated algorithms)
    // For now, just return the first 'limit' ads
    return relevantAds.slice(0, limit)
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
