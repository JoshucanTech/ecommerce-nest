import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { FilterPermissionsDto } from './dto/filter-permissions.dto';
import { PermissionAction, PermissionResource } from '@prisma/client';

@Injectable()
export class PermissionsService {
    constructor(private prisma: PrismaService) { }

    async create(createPermissionDto: CreatePermissionDto) {
        // Check if permission with same name exists
        const existing = await this.prisma.permission.findUnique({
            where: { name: createPermissionDto.name },
        });

        if (existing) {
            throw new ConflictException('Permission with this name already exists');
        }

        return this.prisma.permission.create({
            data: createPermissionDto,
        });
    }

    async findAll(filters: FilterPermissionsDto) {
        const { page, limit, search, action, resource, category } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (action) {
            where.action = action;
        }

        if (resource) {
            where.resource = resource;
        }

        if (category) {
            where.category = category;
        }

        const [permissions, total] = await Promise.all([
            this.prisma.permission.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    { category: 'asc' },
                    { resource: 'asc' },
                    { action: 'asc' },
                ],
                include: {
                    _count: {
                        select: { roles: true },
                    },
                },
            }),
            this.prisma.permission.count({ where }),
        ]);

        return {
            data: permissions,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const permission = await this.prisma.permission.findUnique({
            where: { id },
            include: {
                roles: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });

        if (!permission) {
            throw new NotFoundException(`Permission with ID ${id} not found`);
        }

        return permission;
    }

    async update(id: string, updatePermissionDto: UpdatePermissionDto) {
        await this.findOne(id); // Verify exists

        // Check name uniqueness if name is being updated
        if (updatePermissionDto.name) {
            const existing = await this.prisma.permission.findFirst({
                where: {
                    name: updatePermissionDto.name,
                    id: { not: id },
                },
            });

            if (existing) {
                throw new ConflictException('Permission with this name already exists');
            }
        }

        return this.prisma.permission.update({
            where: { id },
            data: updatePermissionDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Verify exists

        // Check if permission is assigned to any roles
        const rolesCount = await this.prisma.rolePermission.count({
            where: { permissionId: id },
        });

        if (rolesCount > 0) {
            throw new ConflictException(
                `Cannot delete permission. It is assigned to ${rolesCount} role(s). Remove it from all roles first.`,
            );
        }

        await this.prisma.permission.delete({
            where: { id },
        });

        return { message: 'Permission deleted successfully' };
    }

    async getResources() {
        return Object.values(PermissionResource);
    }

    async getActions() {
        return Object.values(PermissionAction);
    }

    async getCategories() {
        const categories = await this.prisma.permission.findMany({
            where: { category: { not: null } },
            select: { category: true },
            distinct: ['category'],
        });

        return categories.map((c) => c.category).filter(Boolean);
    }
}
