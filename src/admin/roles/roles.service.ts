import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) { }

    async create(createRoleDto: CreateRoleDto) {
        const { permissionIds, ...roleData } = createRoleDto;

        // Check if role with same name exists
        const existing = await this.prisma.role.findUnique({
            where: { name: roleData.name },
        });

        if (existing) {
            throw new ConflictException('Role with this name already exists');
        }

        // Create role
        const role = await this.prisma.role.create({
            data: roleData,
        });

        // Assign permissions if provided
        if (permissionIds && permissionIds.length > 0) {
            await this.assignPermissions(role.id, { permissionIds });
        }

        return this.findOne(role.id);
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

        const [roles, total] = await Promise.all([
            this.prisma.role.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: {
                            permissions: true,
                            users: true,
                        },
                    },
                },
            }),
            this.prisma.role.count({ where }),
        ]);

        return {
            data: roles,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                permissions: {
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

        if (!role) {
            throw new NotFoundException(`Role with ID ${id} not found`);
        }

        // Transform permissions for easier consumption
        const transformedRole = {
            ...role,
            permissions: role.permissions.map((rp) => rp.permission),
            userCount: role._count.users,
        };

        delete transformedRole._count;

        return transformedRole;
    }

    async update(id: string, updateRoleDto: UpdateRoleDto) {
        await this.findOne(id); // Verify exists

        const { permissionIds, ...roleData } = updateRoleDto;

        // Check name uniqueness if name is being updated
        if (roleData.name) {
            const existing = await this.prisma.role.findFirst({
                where: {
                    name: roleData.name,
                    id: { not: id },
                },
            });

            if (existing) {
                throw new ConflictException('Role with this name already exists');
            }
        }

        const role = await this.prisma.role.update({
            where: { id },
            data: roleData,
        });

        // Update permissions if provided
        if (permissionIds) {
            // Remove all existing permissions
            await this.prisma.rolePermission.deleteMany({
                where: { roleId: id },
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

        // Check if role is assigned to any users
        const usersCount = await this.prisma.user.count({
            where: {
                roles: {
                    some: { id },
                },
            },
        });

        if (usersCount > 0) {
            throw new ConflictException(
                `Cannot delete role. It is assigned to ${usersCount} user(s). Remove it from all users first.`,
            );
        }

        await this.prisma.role.delete({
            where: { id },
        });

        return { message: 'Role deleted successfully' };
    }

    async assignPermissions(roleId: string, dto: AssignPermissionsDto) {
        await this.findOne(roleId); // Verify role exists

        // Verify all permissions exist
        const permissions = await this.prisma.permission.findMany({
            where: { id: { in: dto.permissionIds } },
        });

        if (permissions.length !== dto.permissionIds.length) {
            throw new BadRequestException('One or more permission IDs are invalid');
        }

        // Create role-permission associations
        const rolePermissions = dto.permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
        }));

        await this.prisma.rolePermission.createMany({
            data: rolePermissions,
            skipDuplicates: true,
        });

        return this.findOne(roleId);
    }

    async removePermission(roleId: string, permissionId: string) {
        await this.findOne(roleId); // Verify role exists

        const deleted = await this.prisma.rolePermission.deleteMany({
            where: {
                roleId,
                permissionId,
            },
        });

        if (deleted.count === 0) {
            throw new NotFoundException(
                'Permission not found in this role or already removed',
            );
        }

        return { message: 'Permission removed from role successfully' };
    }
}
