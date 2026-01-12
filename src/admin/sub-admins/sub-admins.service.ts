import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubAdminDto } from './dto/create-sub-admin.dto';
import { UpdateSubAdminDto } from './dto/update-sub-admin.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { UpdateScopeDto } from './dto/update-scope.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SubAdminsService {
    constructor(private prisma: PrismaService) { }

    async create(createSubAdminDto: CreateSubAdminDto) {
        const {
            email,
            password,
            firstName,
            lastName,
            phone,
            roleIds,
            allowedCities,
            allowedStates,
            allowedRegions,
            allowedCountries,
            departments,
            teams,
            validFrom,
            validUntil,
            notes,
            isActive,
        } = createSubAdminDto;

        // Check if user with email already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Verify all roles exist
        const roles = await this.prisma.role.findMany({
            where: { id: { in: roleIds } },
        });

        if (roles.length !== roleIds.length) {
            throw new BadRequestException('One or more role IDs are invalid');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with SUB_ADMIN role
        const user = await this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone,
                role: 'SUB_ADMIN',
                isActive: isActive ?? true,
                emailVerified: true, // Auto-verify sub-admins
            },
        });

        // Create SubAdminProfile
        await this.prisma.subAdminProfile.create({
            data: {
                userId: user.id,
                allowedCities: allowedCities || [],
                allowedStates: allowedStates || [],
                allowedRegions: allowedRegions || [],
                allowedCountries: allowedCountries || [],
                departments: departments || [],
                teams: teams || [],
                validFrom: validFrom ? new Date(validFrom) : null,
                validUntil: validUntil ? new Date(validUntil) : null,
                notes,
                isActive: isActive ?? true,
            },
        });

        // Assign roles
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                roles: {
                    connect: roleIds.map((id) => ({ id })),
                },
            },
        });

        // Create audit log
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE_SUB_ADMIN',
                resource: 'SubAdmin',
                resourceId: user.id,
                changes: {
                    roles: roleIds,
                    scope: {
                        cities: allowedCities,
                        states: allowedStates,
                        regions: allowedRegions,
                        countries: allowedCountries,
                    },
                },
            },
        });

        return this.findOne(user.id);
    }

    async findAll(params?: { page?: number; limit?: number; search?: string }) {
        const { page = 1, limit = 10, search } = params || {};
        const skip = (page - 1) * limit;

        const where: any = {
            role: 'SUB_ADMIN',
        };

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [subAdmins, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    roles: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                        },
                    },
                    subAdminProfile: {
                        select: {
                            allowedCities: true,
                            allowedStates: true,
                            allowedRegions: true,
                            allowedCountries: true,
                            departments: true,
                            teams: true,
                            validFrom: true,
                            validUntil: true,
                            isActive: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: subAdmins,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const subAdmin = await this.prisma.user.findFirst({
            where: {
                id,
                role: 'SUB_ADMIN',
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                lastLogin: true,
                roles: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        permissions: {
                            include: {
                                permission: {
                                    select: {
                                        id: true,
                                        name: true,
                                        action: true,
                                        resource: true,
                                        category: true,
                                    },
                                },
                            },
                        },
                    },
                },
                subAdminProfile: true,
            },
        });

        if (!subAdmin) {
            throw new NotFoundException(`Sub-admin with ID ${id} not found`);
        }

        // Transform roles to include permissions directly
        const transformedRoles = subAdmin.roles.map((role) => ({
            ...role,
            permissions: role.permissions.map((rp) => rp.permission),
        }));

        return {
            ...subAdmin,
            roles: transformedRoles,
        };
    }

    async update(id: string, updateSubAdminDto: UpdateSubAdminDto) {
        await this.findOne(id); // Verify exists

        const { roleIds, ...updateData } = updateSubAdminDto;

        // Update user basic info
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                phone: updateData.phone,
                isActive: updateData.isActive,
            },
        });

        // Update roles if provided
        if (roleIds) {
            // Verify all roles exist
            const roles = await this.prisma.role.findMany({
                where: { id: { in: roleIds } },
            });

            if (roles.length !== roleIds.length) {
                throw new BadRequestException('One or more role IDs are invalid');
            }

            // Disconnect all existing roles and connect new ones
            await this.prisma.user.update({
                where: { id },
                data: {
                    roles: {
                        set: [],
                        connect: roleIds.map((roleId) => ({ id: roleId })),
                    },
                },
            });
        }

        // Update SubAdminProfile if scope data provided
        const scopeData: any = {};
        if (updateData.allowedCities !== undefined)
            scopeData.allowedCities = updateData.allowedCities;
        if (updateData.allowedStates !== undefined)
            scopeData.allowedStates = updateData.allowedStates;
        if (updateData.allowedRegions !== undefined)
            scopeData.allowedRegions = updateData.allowedRegions;
        if (updateData.allowedCountries !== undefined)
            scopeData.allowedCountries = updateData.allowedCountries;
        if (updateData.departments !== undefined)
            scopeData.departments = updateData.departments;
        if (updateData.teams !== undefined) scopeData.teams = updateData.teams;
        if (updateData.validFrom !== undefined)
            scopeData.validFrom = new Date(updateData.validFrom);
        if (updateData.validUntil !== undefined)
            scopeData.validUntil = new Date(updateData.validUntil);
        if (updateData.notes !== undefined) scopeData.notes = updateData.notes;

        if (Object.keys(scopeData).length > 0) {
            await this.prisma.subAdminProfile.update({
                where: { userId: id },
                data: scopeData,
            });
        }

        return this.findOne(id);
    }

    async remove(id: string) {
        await this.findOne(id); // Verify exists

        // Soft delete by deactivating
        await this.prisma.user.update({
            where: { id },
            data: { isActive: false },
        });

        await this.prisma.subAdminProfile.update({
            where: { userId: id },
            data: { isActive: false },
        });

        return { message: 'Sub-admin deactivated successfully' };
    }

    async assignRoles(id: string, dto: AssignRolesDto) {
        await this.findOne(id); // Verify exists

        // Verify all roles exist
        const roles = await this.prisma.role.findMany({
            where: { id: { in: dto.roleIds } },
        });

        if (roles.length !== dto.roleIds.length) {
            throw new BadRequestException('One or more role IDs are invalid');
        }

        await this.prisma.user.update({
            where: { id },
            data: {
                roles: {
                    connect: dto.roleIds.map((roleId) => ({ id: roleId })),
                },
            },
        });

        return this.findOne(id);
    }

    async removeRole(id: string, roleId: string) {
        await this.findOne(id); // Verify exists

        await this.prisma.user.update({
            where: { id },
            data: {
                roles: {
                    disconnect: { id: roleId },
                },
            },
        });

        return { message: 'Role removed from sub-admin successfully' };
    }

    async updateScope(id: string, dto: UpdateScopeDto) {
        await this.findOne(id); // Verify exists

        const updateData: any = {};
        if (dto.allowedCities !== undefined)
            updateData.allowedCities = dto.allowedCities;
        if (dto.allowedStates !== undefined)
            updateData.allowedStates = dto.allowedStates;
        if (dto.allowedRegions !== undefined)
            updateData.allowedRegions = dto.allowedRegions;
        if (dto.allowedCountries !== undefined)
            updateData.allowedCountries = dto.allowedCountries;
        if (dto.departments !== undefined) updateData.departments = dto.departments;
        if (dto.teams !== undefined) updateData.teams = dto.teams;
        if (dto.validFrom !== undefined)
            updateData.validFrom = new Date(dto.validFrom);
        if (dto.validUntil !== undefined)
            updateData.validUntil = new Date(dto.validUntil);

        await this.prisma.subAdminProfile.update({
            where: { userId: id },
            data: updateData,
        });

        return this.findOne(id);
    }

    async getActivity(
        id: string,
        params?: { page?: number; limit?: number; action?: string },
    ) {
        await this.findOne(id); // Verify exists

        const { page = 1, limit = 10, action } = params || {};
        const skip = (page - 1) * limit;

        const where: any = { userId: id };
        if (action) {
            where.action = action;
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
