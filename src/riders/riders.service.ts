import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import  { PrismaService } from "../prisma/prisma.service";
// import { CreateRiderApplicationDto } from "./dto/create-rider-application.dto"
// import { UpdateRiderDto } from "./dto/update-rider.dto"
// import { UpdateRiderApplicationDto } from "./dto/update-rider-application.dto"
import { UpdateLocationDto } from "./dto/update-location.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class RidersService {
  constructor(private prisma: PrismaService) {}

  async apply(
    createRiderApplicationDto: Prisma.RiderApplicationCreateInput,
    userId: string,
  ) {
    // Check if user already has an application
    const existingApplication = await this.prisma.riderApplication.findUnique({
      where: { userId },
    });

    if (existingApplication) {
      throw new ConflictException("User already has a rider application");
    }

    // Check if user is already a rider
    const existingRider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (existingRider) {
      throw new ConflictException("User is already a rider");
    }

    // Create rider application
    return this.prisma.rider.create({
      data: {
        ...createRiderApplicationDto, // includes userId
      },
      include: {
        user: true, // 🔁 this tells Prisma to return the related user
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
      this.prisma.rider.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
      throw new NotFoundException("Rider application not found");
    }

    return application;
  }

  async getApplicationById(id: string) {
    const application = await this.prisma.rider.findUnique({
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
    const application = await this.prisma.rider.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Rider application with ID ${id} not found`);
    }

    // Check if application is already approved
    if (application.status === "APPROVED") {
      throw new BadRequestException("Application is already approved");
    }

    // Check if user is already a rider
    const existingRider = await this.prisma.rider.findUnique({
      where: { userId: application.userId },
    });

    if (existingRider) {
      throw new ConflictException("User is already a rider");
    }

    // Update user role to RIDER
    await this.prisma.user.update({
      where: { id: application.userId },
      data: { role: "RIDER" },
    });

    // Create rider
    const rider = await this.prisma.rider.create({
      data: {
        userId: application.userId,
        vehicleType: application.vehicleType,
        // vehiclePlate: application.vehicleNumber,
        licenseNumber: application.licenseNumber,
        identityDocument: application.identityDocument,
      },
    });

    // Update application status
    await this.prisma.riderApplication.update({
      where: { id },
      data: {
        status: "APPROVED",
        notes: "Application approved. Rider account created.",
      },
    });

    return {
      message: "Application approved successfully",
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
    if (application.status === "REJECTED") {
      throw new BadRequestException("Application is already rejected");
    }

    // Update application status
    await this.prisma.riderApplication.update({
      where: { id },
      data: {
        status: "REJECTED",
        notes: notes || "Application rejected.",
      },
    });

    return {
      message: "Application rejected successfully",
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
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
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
        orderBy: { createdAt: "desc" },
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
    // Convert radius from kilometers to degrees (approximate)
    // 1 degree of latitude = ~111 km
    const radiusDegrees = radiusKm / 111;

    // Find available riders within the radius
    const riders = await this.prisma.rider.findMany({
      where: {
        isAvailable: true,
        isVerified: true,
        currentLatitude: {
          not: null,
        },
        currentLongitude: {
          not: null,
        },
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
        // Calculate distance using Haversine formula
        const distance = this.calculateDistance(
          latitude,
          longitude,
          (rider.currentLatitude || 0) as number,
          (rider.currentLongitude || 0) as number,
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
    // Get rider by user ID
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException("Rider profile not found");
    }

    // Update rider
    return this.prisma.rider.update({
      where: { id: rider.id },
      data: updateRiderDto,
    });
  }

  async updateLocation(
    userId: string,
    updateLocationDto: Prisma.RiderUpdateInput,
  ) {
    // Get rider by user ID
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException("Rider profile not found");
    }

    // Update rider location
    return this.prisma.rider.update({
      where: { id: rider.id },
      data: {
        currentLatitude: updateLocationDto.currentLatitude,
        currentLongitude: updateLocationDto.currentLongitude,
      },
    });
  }

  async toggleAvailability(userId: string, isAvailable: boolean) {
    // Get rider by user ID
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException("Rider profile not found");
    }

    // Check if rider is verified
    if (!rider.isVerified) {
      throw new BadRequestException("Rider is not verified yet");
    }

    // Update rider availability
    return this.prisma.rider.update({
      where: { id: rider.id },
      data: { isAvailable },
    });
  }

  async update(id: string, updateRiderDto: Prisma.RiderUpdateInput) {
    // Check if rider exists
    const rider = await this.prisma.rider.findUnique({
      where: { id },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID ${id} not found`);
    }

    // Update rider
    return this.prisma.rider.update({
      where: { id },
      data: updateRiderDto,
    });
  }

  private calculateDistance(
    lat1: number,
    lon1: number ,
    lat2: number ,
    lon2: number ,
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
