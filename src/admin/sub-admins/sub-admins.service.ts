import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubAdminDto } from './dto/create-sub-admin.dto';
import { UpdateSubAdminDto } from './dto/update-sub-admin.dto';
import { AssignPositionsDto } from './dto/assign-positions.dto';
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
            positionIds,
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

        // Verify all positions exist
        const positions = await this.prisma.position.findMany({
            where: { id: { in: positionIds } },
        });

        if (positions.length !== positionIds.length) {
            throw new BadRequestException('One or more position IDs are invalid');
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

        // Assign positions
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                positions: {
                    connect: positionIds.map((id) => ({ id })),
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
                    positions: positionIds,
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
                    positions: {
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
                positions: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        positionPermissions: {
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

        // Transform positions to include permissions directly
        const transformedPositions = subAdmin.positions.map((position) => ({
            ...position,
            permissions: position.positionPermissions.map((pp) => pp.permission),
        }));

        // Remove helper field before returning
        const safePositions = transformedPositions.map(pos => {
            const { positionPermissions, ...rest } = pos;
            return rest;
        });

        return {
            ...subAdmin,
            positions: safePositions,
        };
    }

    async update(id: string, updateSubAdminDto: UpdateSubAdminDto) {
        await this.findOne(id); // Verify exists

        // positionIds is now explicitly typed in UpdateSubAdminDto
        const { positionIds, ...updateData } = updateSubAdminDto;

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

        // Update positions if provided
        if (positionIds) {
            // Verify all positions exist
            const positions = await this.prisma.position.findMany({
                where: { id: { in: positionIds } },
            });

            if (positions.length !== positionIds.length) {
                throw new BadRequestException('One or more position IDs are invalid');
            }

            // Disconnect all existing positions and connect new ones
            await this.prisma.user.update({
                where: { id },
                data: {
                    positions: {
                        set: [],
                        connect: positionIds.map((positionId: string) => ({ id: positionId })),
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
            await this.prisma.subAdminProfile.upsert({
                where: { userId: id },
                update: scopeData,
                create: {
                    userId: id,
                    allowedCities: scopeData.allowedCities || [],
                    allowedStates: scopeData.allowedStates || [],
                    allowedRegions: scopeData.allowedRegions || [],
                    allowedCountries: scopeData.allowedCountries || [],
                    departments: scopeData.departments || [],
                    teams: scopeData.teams || [],
                    validFrom: scopeData.validFrom || null,
                    validUntil: scopeData.validUntil || null,
                    notes: scopeData.notes || '',
                    isActive: true,
                },
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

    async assignPositions(id: string, dto: AssignPositionsDto) {
        await this.findOne(id); // Verify exists

        // Verify all positions exist
        const positions = await this.prisma.position.findMany({
            where: { id: { in: dto.positionIds } },
        });

        if (positions.length !== dto.positionIds.length) {
            throw new BadRequestException('One or more position IDs are invalid');
        }

        await this.prisma.user.update({
            where: { id },
            data: {
                positions: {
                    connect: dto.positionIds.map((positionId) => ({ id: positionId })),
                },
            },
        });

        return this.findOne(id);
    }

    async removePosition(id: string, positionId: string) {
        await this.findOne(id); // Verify exists

        await this.prisma.user.update({
            where: { id },
            data: {
                positions: {
                    disconnect: { id: positionId },
                },
            },
        });

        return { message: 'Position removed from sub-admin successfully' };
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
