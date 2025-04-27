import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common"
import  { PrismaService } from "../prisma/prisma.service"
import  { CreateAdvertisementDto } from "./dto/create-advertisement.dto"
import  { UpdateAdvertisementDto } from "./dto/update-advertisement.dto"
import { AdStatus, UserRole } from "@prisma/client"
import  { AdPlatformsService } from "./ad-platforms.service"
import  { AdTargetingService } from "./ad-targeting.service"

@Injectable()
export class AdvertisementsService {
  constructor(
    private prisma: PrismaService,
    private adPlatformsService: AdPlatformsService,
    private adTargetingService: AdTargetingService,
  ) {}

  async create(createAdvertisementDto: CreateAdvertisementDto, user: any) {
    // Check if user is authorized to create an ad for this vendor
    if (user.role !== UserRole.ADMIN && createAdvertisementDto.vendorId !== user.vendorId) {
      throw new ForbiddenException("You are not authorized to create advertisements for this vendor")
    }

    // Extract platforms and targeting from DTO
    const { platforms, targeting, ...adData } = createAdvertisementDto

    // Create advertisement
    const advertisement = await this.prisma.advertisement.create({
      data: {
        ...adData,
        status: AdStatus.DRAFT,
      },
    })

    // Create targeting if provided
    if (targeting) {
      await this.adTargetingService.createTargeting(advertisement.id, targeting)
    }

    // Create platform configs if provided
    if (platforms && platforms.length > 0) {
      for (const platform of platforms) {
        await this.adPlatformsService.create(
          {
            advertisementId: advertisement.id,
            platform: platform as any,
            isActive: true,
          },
          user,
        )
      }
    }

    return this.findOne(advertisement.id, user)
  }

  async findAll(params: {
    page: number
    limit: number
    status?: AdStatus
    vendorId?: string
    user: any
  }) {
    const { page, limit, status, vendorId, user } = params
    const skip = (page - 1) * limit

    // Build where conditions
    const where: any = {}

    if (status) {
      where.status = status
    }

    // If user is not an admin, they can only see their own vendor's ads
    if (user.role !== UserRole.ADMIN) {
      where.vendorId = user.vendorId
    } else if (vendorId) {
      where.vendorId = vendorId
    }

    // Get advertisements with pagination
    const [advertisements, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              businessLogo: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              images: true,
            },
          },
          targeting: true,
          platformConfigs: {
            select: {
              id: true,
              platform: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.advertisement.count({ where }),
    ])

    return {
      data: advertisements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findOne(id: string, user: any) {
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            businessLogo: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            price: true,
          },
        },
        targeting: true,
        platformConfigs: true,
        analytics: {
          orderBy: { date: "desc" },
          take: 30,
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`)
    }

    // Check if user is authorized to view this advertisement
    if (user.role !== UserRole.ADMIN && advertisement.vendorId !== user.vendorId) {
      throw new ForbiddenException("You are not authorized to view this advertisement")
    }

    return advertisement
  }

  async update(id: string, updateAdvertisementDto: UpdateAdvertisementDto, user: any) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
    })

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`)
    }

    // Check if user is authorized to update this advertisement
    if (user.role !== UserRole.ADMIN && advertisement.vendorId !== user.vendorId) {
      throw new ForbiddenException("You are not authorized to update this advertisement")
    }

    // Check if advertisement is in a state that can be updated
    if (
      advertisement.status !== AdStatus.DRAFT &&
      advertisement.status !== AdStatus.REJECTED &&
      user.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException("Advertisement can only be updated when in DRAFT or REJECTED status")
    }

    // Extract platforms and targeting from DTO
    const { platforms, targeting, ...adData } = updateAdvertisementDto

    // Update advertisement
    await this.prisma.advertisement.update({
      where: { id },
      data: adData,
    })

    // Update targeting if provided
    if (targeting) {
      // await this.adTargetingService.updateTargeting(id, targeting, user)
      await this.adTargetingService.updateTargeting(id, targeting)
    }

    // Update platform configs if provided
    if (platforms && platforms.length > 0) {
      // Get existing platform configs
      const existingConfigs = await this.prisma.adPlatformConfig.findMany({
        where: { advertisementId: id },
      })

      // Create new platform configs
      for (const platform of platforms) {
        const existingConfig = existingConfigs.find((config) => config.platform === platform)

        if (!existingConfig) {
          await this.adPlatformsService.create(
            {
              advertisementId: id,
              platform: platform as any,
              isActive: true,
            },
            user,
          )
        }
      }

      // Deactivate removed platform configs
      for (const config of existingConfigs) {
        if (!platforms.includes(config.platform)) {
          await this.prisma.adPlatformConfig.update({
            where: { id: config.id },
            data: { isActive: false },
          })
        }
      }
    }

    return this.findOne(id, user)
  }

  async remove(id: string, user: any) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
    })

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`)
    }

    // Check if user is authorized to delete this advertisement
    if (user.role !== UserRole.ADMIN && advertisement.vendorId !== user.vendorId) {
      throw new ForbiddenException("You are not authorized to delete this advertisement")
    }

    // Delete advertisement
    await this.prisma.advertisement.delete({
      where: { id },
    })

    return { message: "Advertisement deleted successfully" }
  }

  async updateStatus(id: string, status: AdStatus, user: any) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
    })

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`)
    }

    // Check if user is authorized to update this advertisement
    if (user.role !== UserRole.ADMIN && advertisement.vendorId !== user.vendorId) {
      throw new ForbiddenException("You are not authorized to update this advertisement")
    }

    // Validate status transitions
    this.validateStatusTransition(advertisement.status, status, user.role)

    // Update advertisement status
    const updatedAd = await this.prisma.advertisement.update({
      where: { id },
      data: {
        status,
        reviewedBy: status === AdStatus.ACTIVE || status === AdStatus.REJECTED ? user.id : undefined,
        reviewedAt: status === AdStatus.ACTIVE || status === AdStatus.REJECTED ? new Date() : undefined,
      },
    })

    // If status is ACTIVE, sync with external platforms
    if (status === AdStatus.ACTIVE) {
      const platformConfigs = await this.prisma.adPlatformConfig.findMany({
        where: { advertisementId: id, isActive: true },
      })

      for (const config of platformConfigs) {
        await this.adPlatformsService.syncWithPlatform(config.id, user)
      }
    }

    return updatedAd
  }

  async rejectAdvertisement(id: string, notes: string, user: any) {
    // Check if advertisement exists
    const advertisement = await this.prisma.advertisement.findUnique({
      where: { id },
    })

    if (!advertisement) {
      throw new NotFoundException(`Advertisement with ID ${id} not found`)
    }

    // Check if user is authorized to reject this advertisement
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You are not authorized to reject this advertisement")
    }

    // Update advertisement status
    const updatedAd = await this.prisma.advertisement.update({
      where: { id },
      data: {
        status: AdStatus.REJECTED,
        reviewNotes: notes,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    })

    return updatedAd
  }

  private validateStatusTransition(currentStatus: AdStatus, newStatus: AdStatus, userRole: UserRole) {
    // Define allowed transitions based on current status and user role
    const allowedTransitions: Record<AdStatus, Record<UserRole, AdStatus[]>> = {
      [AdStatus.DRAFT]: {
        [UserRole.VENDOR]: [AdStatus.PENDING_APPROVAL],
        [UserRole.ADMIN]: [AdStatus.PENDING_APPROVAL, AdStatus.ACTIVE, AdStatus.REJECTED, AdStatus.ARCHIVED],
        [UserRole.SUB_ADMIN]: [AdStatus.PENDING_APPROVAL, AdStatus.ACTIVE, AdStatus.REJECTED],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.PENDING_APPROVAL]: {
        [UserRole.VENDOR]: [AdStatus.DRAFT, AdStatus.ARCHIVED],
        [UserRole.ADMIN]: [AdStatus.ACTIVE, AdStatus.REJECTED, AdStatus.DRAFT, AdStatus.ARCHIVED],
        [UserRole.SUB_ADMIN]: [ AdStatus.ACTIVE, AdStatus.REJECTED],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.ACTIVE]: {
        [UserRole.VENDOR]: [AdStatus.PAUSED, AdStatus.ARCHIVED],
        [UserRole.ADMIN]: [AdStatus.PAUSED, AdStatus.REJECTED, AdStatus.COMPLETED, AdStatus.ARCHIVED],
        [UserRole.SUB_ADMIN]: [ AdStatus.PAUSED, AdStatus.COMPLETED ],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.PAUSED]: {
        [UserRole.VENDOR]: [AdStatus.ACTIVE, AdStatus.ARCHIVED],
        [UserRole.ADMIN]: [AdStatus.ACTIVE, AdStatus.REJECTED, AdStatus.COMPLETED, AdStatus.ARCHIVED],
        [UserRole.SUB_ADMIN]: [AdStatus.ACTIVE, AdStatus.REJECTED, AdStatus.COMPLETED],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.REJECTED]: {
        [UserRole.VENDOR]: [AdStatus.DRAFT, AdStatus.ARCHIVED],
        [UserRole.ADMIN]: [AdStatus.DRAFT, AdStatus.ACTIVE, AdStatus.PENDING_APPROVAL, AdStatus.ARCHIVED],
        [UserRole.SUB_ADMIN]: [AdStatus.DRAFT, AdStatus.ACTIVE, AdStatus.PENDING_APPROVAL],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.COMPLETED]: {
        [UserRole.VENDOR]: [AdStatus.ARCHIVED],
        [UserRole.ADMIN]: [AdStatus.ACTIVE, AdStatus.ARCHIVED],
        [UserRole.SUB_ADMIN]: [AdStatus.ACTIVE],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
      [AdStatus.ARCHIVED]: {
        [UserRole.VENDOR]: [AdStatus.DRAFT],
        [UserRole.ADMIN]: [AdStatus.DRAFT, AdStatus.ACTIVE, AdStatus.PENDING_APPROVAL],
        [UserRole.SUB_ADMIN]: [AdStatus.DRAFT, AdStatus.ACTIVE, AdStatus.PENDING_APPROVAL],
        [UserRole.BUYER]: [],
        [UserRole.RIDER]: [],
      },
    }

    if (!allowedTransitions[currentStatus][userRole].includes(newStatus)) {
      throw new BadRequestException(`Cannot transition advertisement from ${currentStatus} to ${newStatus}`)
    }
  }
}
