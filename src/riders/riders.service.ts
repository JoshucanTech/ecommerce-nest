import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiderApplicationDto } from './dto/create-rider-application.dto';
import { Prisma } from '@prisma/client';
import { calculateDistance } from '../utils/geo';

@Injectable()
export class RidersService {
  constructor(private prisma: PrismaService) { }

  async apply(
    createRiderApplicationDto: CreateRiderApplicationDto,
    userId: string,
  ) {
    // Check if user already has an application
    const existingApplication = await this.prisma.riderApplication.findUnique({
      where: { userId },
    });

    if (existingApplication) {
      throw new ConflictException('User already has a rider application');
    }

    // Check if user is already a rider
    const existingRider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (existingRider) {
      throw new ConflictException('User is already a rider');
    }

    // Check if license number is unique
    const licenseExists = await this.prisma.riderApplication.findFirst({
      where: { licenseNumber: createRiderApplicationDto.licenseNumber },
    });

    if (licenseExists) {
      throw new ConflictException('License number already in use');
    }

    // Create rider application
    return this.prisma.riderApplication.create({
      data: {
        ...createRiderApplicationDto,
        userId,
        status: 'PENDING',
      },
    });
  }

  async getApplications(params: {
    page: number;
    limit: number;
    status?: string;
  }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (status) {
      where.status = status;
    }

    // Get applications with pagination
    const [applications, total] = await Promise.all([
      this.prisma.riderApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.riderApplication.count({ where }),
    ]);

    return {
      data: applications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getApplicationByUserId(userId: string) {
    const application = await this.prisma.riderApplication.findUnique({
      where: { userId },
    });

    if (!application) {
      throw new NotFoundException('Rider application not found');
    }

    return application;
  }

  async getApplicationById(id: string) {
    const application = await this.prisma.riderApplication.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Rider application with ID ${id} not found`);
    }

    return application;
  }

  async updateApplication(
    id: string,
    updateRiderApplicationDto: Prisma.RiderApplicationUpdateInput,
  ) {
    // Check if application exists
    const application = await this.prisma.riderApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Rider application with ID ${id} not found`);
    }

    // Update application
    return this.prisma.riderApplication.update({
      where: { id },
      data: updateRiderApplicationDto,
    });
  }

  async approveApplication(id: string) {
    // Check if application exists
    const application = await this.prisma.riderApplication.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Rider application with ID ${id} not found`);
    }

    // Check if application is already approved
    if (application.status === 'APPROVED') {
      throw new BadRequestException('Application is already approved');
    }

    // Check if user is already a rider
    const existingRider = await this.prisma.rider.findUnique({
      where: { userId: application.userId },
    });

    if (existingRider) {
      throw new ConflictException('User is already a rider');
    }

    // Update user role to RIDER
    await this.prisma.user.update({
      where: { id: application.userId },
      data: { role: 'RIDER' },
    });

    // Create rider
    const rider = await this.prisma.rider.create({
      data: {
        userId: application.userId,
        vehicleType: application.vehicleType,
        vehiclePlate: application.vehiclePlate,
        licenseNumber: application.licenseNumber,
        identityDocument: application.identityDocument,
        isVerified: true, // Auto-verify on approval
        status: 'APPROVED',
      },
    });

    // Update application status
    await this.prisma.riderApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        notes: 'Application approved. Rider account created.',
      },
    });

    return {
      message: 'Application approved successfully',
      rider,
    };
  }

  async rejectApplication(id: string, notes?: string) {
    // Check if application exists
    const application = await this.prisma.riderApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Rider application with ID ${id} not found`);
    }

    // Check if application is already rejected
    if (application.status === 'REJECTED') {
      throw new BadRequestException('Application is already rejected');
    }

    // Update application status
    await this.prisma.riderApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: notes || 'Application rejected.',
      },
    });

    return {
      message: 'Application rejected successfully',
    };
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    isAvailable?: boolean;
  }) {
    const { page, limit, search, isAvailable } = params;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {};

    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    // Get riders with pagination
    const [riders, total] = await Promise.all([
      this.prisma.rider.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              deliveries: true,
            },
          },
        },
      }),
      this.prisma.rider.count({ where }),
    ]);

    // Process riders
    const processedRiders = riders.map((rider) => ({
      ...rider,
      deliveryCount: rider._count.deliveries,
      _count: undefined,
    }));

    return {
      data: processedRiders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAvailable(latitude: number, longitude: number, radiusKm: number) {
    // Find available riders
    const riders = await this.prisma.rider.findMany({
      where: {
        isAvailable: true,
        isVerified: true,
        currentLatitude: { not: null },
        currentLongitude: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    // Filter riders by distance
    const ridersWithDistance = riders
      .map((rider) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          rider.currentLatitude || 0,
          rider.currentLongitude || 0,
        );

        return {
          ...rider,
          distance: Number.parseFloat(distance.toFixed(2)),
        };
      })
      .filter((rider) => rider.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return {
      data: ridersWithDistance,
      meta: {
        total: ridersWithDistance.length,
      },
    };
  }

  async findOne(id: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${id} not found`);
    }

    return {
      ...rider,
      deliveryCount: rider._count.deliveries,
      _count: undefined,
    };
  }

  async updateProfile(userId: string, updateRiderDto: Prisma.RiderUpdateInput) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }

    return this.prisma.rider.update({
      where: { id: rider.id },
      data: updateRiderDto,
    });
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }

    return this.prisma.rider.update({
      where: { id: rider.id },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
      },
    });
  }

  async toggleAvailability(userId: string, isAvailable: boolean) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }

    if (!rider.isVerified) {
      throw new BadRequestException('Rider is not verified yet');
    }

    return this.prisma.rider.update({
      where: { id: rider.id },
      data: { isAvailable },
    });
  }

  async update(id: string, updateRiderDto: Prisma.RiderUpdateInput) {
    const rider = await this.prisma.rider.findUnique({
      where: { id },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${id} not found`);
    }

    return this.prisma.rider.update({
      where: { id },
      data: updateRiderDto,
    });
  }
}
