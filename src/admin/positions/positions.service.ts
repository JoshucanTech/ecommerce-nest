import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Injectable()
export class PositionsService {
    constructor(private prisma: PrismaService) { }

    async create(createPositionDto: CreatePositionDto) {
        const { permissionIds, ...positionData } = createPositionDto;

        // Check if position with same name exists
        const existing = await this.prisma.position.findUnique({
            where: { name: positionData.name },
        });

        if (existing) {
            throw new ConflictException('Position with this name already exists');
        }

        // Create position
        const position = await this.prisma.position.create({
            data: positionData,
        });

        // Assign permissions if provided
        if (permissionIds && permissionIds.length > 0) {
            await this.assignPermissions(position.id, { permissionIds });
        }

        return this.findOne(position.id);
    }

    async findAll(params?: { page?: number; limit?: number; search?: string }) {
        const { page = 1, limit = 10, search } = params || {};
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [positions, total] = await Promise.all([
            this.prisma.position.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                    positionPermissions: {
                        include: {
                            permission: {
                                select: {
                                    id: true,
                                    name: true,
                                    resource: true,
                                    action: true,
                                    description: true,
                                    category: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            positionPermissions: true,
                            users: true,
                        },
                    },
                },
            }),
            this.prisma.position.count({ where }),
        ]);

        const mappedPositions = positions.map((position) => {
            const { positionPermissions, _count, ...rest } = position;
            return {
                ...rest,
                permissions: positionPermissions.map((pp) => pp.permission),
                _count: {
                    permissions: _count.positionPermissions,
                    users: _count.users,
                },
            };
        });

        return {
            data: mappedPositions,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const position = await this.prisma.position.findUnique({
            where: { id },
            include: {
                positionPermissions: {
                    include: {
                        permission: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                action: true,
                                resource: true,
                                category: true,
                                level: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        users: true,
                    },
                },
            },
        });

        if (!position) {
            throw new NotFoundException(`Position with ID ${id} not found`);
        }

        // Transform permissions for easier consumption
        const transformedPosition = {
            ...position,
            permissions: position.positionPermissions.map((pp) => pp.permission),
            userCount: position._count.users,
        };

        delete transformedPosition._count;
        delete transformedPosition.positionPermissions;

        return transformedPosition;
    }

    async update(id: string, updatePositionDto: UpdatePositionDto) {
        await this.findOne(id); // Verify exists

        const { permissionIds, ...positionData } = updatePositionDto;

        // Check name uniqueness if name is being updated
        if (positionData.name) {
            const existing = await this.prisma.position.findFirst({
                where: {
                    name: positionData.name,
                    id: { not: id },
                },
            });

            if (existing) {
                throw new ConflictException('Position with this name already exists');
            }
        }

        const position = await this.prisma.position.update({
            where: { id },
            data: positionData,
        });

        // Update permissions if provided
        if (permissionIds) {
            // Remove all existing permissions
            await this.prisma.positionPermission.deleteMany({
                where: { positionId: id },
            });

            // Add new permissions
            if (permissionIds.length > 0) {
                await this.assignPermissions(id, { permissionIds });
            }
        }

        return this.findOne(id);
    }

    async remove(id: string) {
        await this.findOne(id); // Verify exists

        // Check if position is assigned to any users
        const usersCount = await this.prisma.user.count({
            where: {
                positions: {
                    some: { id },
                },
            },
        });

        if (usersCount > 0) {
            throw new ConflictException(
                `Cannot delete position. It is assigned to ${usersCount} user(s). Remove it from all users first.`,
            );
        }

        await this.prisma.position.delete({
            where: { id },
        });

        return { message: 'Position deleted successfully' };
    }

    async assignPermissions(positionId: string, dto: AssignPermissionsDto) {
        // Verify position exists (simplified check)
        const position = await this.prisma.position.findUnique({ where: { id: positionId } });
        if (!position) throw new NotFoundException(`Position with ID ${positionId} not found`);

        // Verify all permissions exist
        const permissions = await this.prisma.permission.findMany({
            where: { id: { in: dto.permissionIds } },
        });

        if (permissions.length !== dto.permissionIds.length) {
            throw new BadRequestException('One or more permission IDs are invalid');
        }

        // Create position-permission associations
        const positionPermissions = dto.permissionIds.map((permissionId) => ({
            positionId,
            permissionId,
        }));

        await this.prisma.positionPermission.createMany({
            data: positionPermissions,
            skipDuplicates: true,
        });

        return this.findOne(positionId);
    }

    async removePermission(positionId: string, permissionId: string) {
        await this.findOne(positionId); // Verify position exists

        const deleted = await this.prisma.positionPermission.deleteMany({
            where: {
                positionId,
                permissionId,
            },
        });

        if (deleted.count === 0) {
            throw new NotFoundException(
                'Permission not found in this position or already removed',
            );
        }

        return { message: 'Permission removed from position successfully' };
    }
}
