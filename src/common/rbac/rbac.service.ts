import { Injectable, ForbiddenException } from '@nestjs/common';
import { PermissionResource, PermissionAction, Permission } from '@prisma/client';
import {
    RbacUser,
    RbacFilterOptions,
    ScopeFilter,
    PermissionScope,
} from './rbac.types';

@Injectable()
export class RbacService {
    /**
     * Check if user has required permissions for a resource
     * @throws ForbiddenException if user lacks permissions
     * @returns Array of matching permissions
     */
    checkPermission(
        user: RbacUser,
        resource: PermissionResource,
        actions: PermissionAction[],
    ): Permission[] {
        const permissions = user.positions.flatMap((p) =>
            p.positionPermissions.map((pp) => pp.permission),
        );

        const relevantPermissions = permissions.filter(
            (p) => p.resource === resource && actions.includes(p.action),
        );

        if (relevantPermissions.length === 0) {
            throw new ForbiddenException(
                `No permission to perform ${actions.join('/')} on ${resource}`,
            );
        }

        return relevantPermissions;
    }

    /**
     * Build Prisma-compatible scope filter based on user permissions
     * @returns Prisma where clause object or null
     */
    buildScopeFilter(
        user: RbacUser,
        resource: PermissionResource,
        actions: PermissionAction[],
        options: RbacFilterOptions = {},
    ): ScopeFilter | null {
        const {
            includeLocation = true,
            includeOrganization = false,
            includeLevel = false,
            addressField,
            userFields = {
                city: 'city',
                state: 'state',
                country: 'country',
                region: 'region',
                department: 'department',
                team: 'team',
            },
        } = options;

        const permissions = user.positions.flatMap((p) =>
            p.positionPermissions.map((pp) => pp.permission),
        );

        const relevantPermissions = permissions.filter(
            (p) => p.resource === resource && actions.includes(p.action),
        );

        if (relevantPermissions.length === 0) {
            return null;
        }

        // Build profile filter (absolute boundaries)
        const profileFilter = this.buildProfileFilter(user, {
            includeLocation,
            includeOrganization,
            addressField,
            userFields,
        });

        // Build permission scopes filter (OR-combined)
        const permissionFilter = this.buildPermissionScopesFilter(
            relevantPermissions,
            {
                includeLocation,
                includeOrganization,
                includeLevel,
                addressField,
                userFields,
            },
        );

        // Combine: Profile boundaries AND Permission scopes
        if (!profileFilter && !permissionFilter) {
            return null;
        }

        const combinedFilter: ScopeFilter = {
            AND: [
                ...(profileFilter ? [profileFilter] : []),
                ...(permissionFilter ? [permissionFilter] : []),
            ].filter(Boolean),
        };

        return combinedFilter.AND && combinedFilter.AND.length > 0
            ? combinedFilter
            : null;
    }

    /**
     * Build profile boundary filter from subAdminProfile
     */
    buildProfileFilter(
        user: RbacUser,
        options: RbacFilterOptions = {},
    ): ScopeFilter | null {
        const {
            includeLocation = true,
            includeOrganization = false,
            addressField,
            userFields = {
                city: 'city',
                state: 'state',
                country: 'country',
                region: 'region',
                department: 'department',
                team: 'team',
            },
        } = options;

        if (!user.subAdminProfile) {
            return null;
        }

        const {
            allowedCities = [],
            allowedStates = [],
            allowedRegions = [],
            allowedCountries = [],
            departments = [],
            teams = [],
        } = user.subAdminProfile;

        const filters: any[] = [];

        // Location filters
        if (includeLocation) {
            const locationFilters: any[] = [];

            if (addressField) {
                // For nested address objects (e.g., orders)
                if (allowedCities.length > 0 || allowedStates.length > 0 || allowedRegions.length > 0 || allowedCountries.length > 0) {
                    const addressLocationFilter = {
                        AND: [
                            ...(allowedCities.length > 0
                                ? [{ [`${addressField}.city`]: { in: allowedCities, mode: 'insensitive' as const } }]
                                : []),
                            ...(allowedStates.length > 0
                                ? [{ [`${addressField}.state`]: { in: allowedStates, mode: 'insensitive' as const } }]
                                : []),
                            ...(allowedRegions.length > 0
                                ? [{ [`${addressField}.region`]: { in: allowedRegions, mode: 'insensitive' as const } }]
                                : []),
                            ...(allowedCountries.length > 0
                                ? [{ [`${addressField}.country`]: { in: allowedCountries, mode: 'insensitive' as const } }]
                                : []),
                        ].filter(Boolean),
                    };
                    if (addressLocationFilter.AND.length > 0) {
                        locationFilters.push(addressLocationFilter);
                    }
                }
            } else {
                // For direct user fields
                if (allowedCities.length > 0 || allowedStates.length > 0 || allowedRegions.length > 0 || allowedCountries.length > 0) {
                    const directLocationFilter = {
                        AND: [
                            ...(allowedCities.length > 0
                                ? [{ [userFields.city!]: { in: allowedCities, mode: 'insensitive' as const } }]
                                : []),
                            ...(allowedStates.length > 0
                                ? [{ [userFields.state!]: { in: allowedStates, mode: 'insensitive' as const } }]
                                : []),
                            ...(allowedRegions.length > 0
                                ? [{ [userFields.region!]: { in: allowedRegions, mode: 'insensitive' as const } }]
                                : []),
                            ...(allowedCountries.length > 0
                                ? [{ [userFields.country!]: { in: allowedCountries, mode: 'insensitive' as const } }]
                                : []),
                        ].filter(Boolean),
                    };
                    if (directLocationFilter.AND.length > 0) {
                        locationFilters.push(directLocationFilter);
                    }
                }
            }

            if (locationFilters.length > 0) {
                filters.push(...locationFilters);
            }
        }

        // Organization filters
        if (includeOrganization) {
            const orgFilters: any[] = [];

            if (departments.length > 0) {
                orgFilters.push({
                    [userFields.department!]: { in: departments, mode: 'insensitive' as const },
                });
            }

            if (teams.length > 0) {
                orgFilters.push({
                    [userFields.team!]: { in: teams, mode: 'insensitive' as const },
                });
            }

            if (orgFilters.length > 0) {
                filters.push(...orgFilters);
            }
        }

        return filters.length > 0 ? { AND: filters } : null;
    }

    /**
     * Build permission-based scope filters (OR-combined)
     */
    buildPermissionScopesFilter(
        permissions: Permission[],
        options: RbacFilterOptions = {},
    ): ScopeFilter | null {
        const {
            includeLocation = true,
            includeOrganization = false,
            includeLevel = false,
            addressField,
            userFields = {
                city: 'city',
                state: 'state',
                country: 'country',
                region: 'region',
                department: 'department',
                team: 'team',
            },
        } = options;

        const hasGlobalPermission = permissions.some((p) => !p.scope);
        if (hasGlobalPermission) {
            // Global permission: no scope restrictions
            return null;
        }

        const permissionFilters = permissions
            .filter((p) => p.scope)
            .map((p) => {
                const scope = p.scope as PermissionScope;
                const filters: any[] = [];

                // Level filter
                if (includeLevel && p.level !== null && p.level !== undefined) {
                    filters.push({ permissionLevel: { lte: p.level } });
                }

                // Location filters
                if (includeLocation && scope.location) {
                    const locationFilters: any[] = [];

                    if (addressField) {
                        // For nested address objects
                        if (scope.location.cities?.length || scope.location.states?.length || scope.location.regions?.length || scope.location.countries?.length) {
                            const addressLocationFilter = {
                                AND: [
                                    ...(scope.location.cities?.length
                                        ? [{ [`${addressField}.city`]: { in: scope.location.cities, mode: 'insensitive' as const } }]
                                        : []),
                                    ...(scope.location.states?.length
                                        ? [{ [`${addressField}.state`]: { in: scope.location.states, mode: 'insensitive' as const } }]
                                        : []),
                                    ...(scope.location.regions?.length
                                        ? [{ [`${addressField}.region`]: { in: scope.location.regions, mode: 'insensitive' as const } }]
                                        : []),
                                    ...(scope.location.countries?.length
                                        ? [{ [`${addressField}.country`]: { in: scope.location.countries, mode: 'insensitive' as const } }]
                                        : []),
                                ].filter(Boolean),
                            };
                            if (addressLocationFilter.AND.length > 0) {
                                locationFilters.push(addressLocationFilter);
                            }
                        }
                    } else {
                        // For direct user fields
                        if (scope.location.cities?.length) {
                            locationFilters.push({
                                [userFields.city!]: { in: scope.location.cities, mode: 'insensitive' as const },
                            });
                        }
                        if (scope.location.states?.length) {
                            locationFilters.push({
                                [userFields.state!]: { in: scope.location.states, mode: 'insensitive' as const },
                            });
                        }
                        if (scope.location.regions?.length) {
                            locationFilters.push({
                                [userFields.region!]: { in: scope.location.regions, mode: 'insensitive' as const },
                            });
                        }
                        if (scope.location.countries?.length) {
                            locationFilters.push({
                                [userFields.country!]: { in: scope.location.countries, mode: 'insensitive' as const },
                            });
                        }
                    }

                    if (locationFilters.length > 0) {
                        filters.push(...locationFilters);
                    }
                }

                // Organization filters
                if (includeOrganization) {
                    if (scope.departments?.length) {
                        filters.push({
                            [userFields.department!]: { in: scope.departments, mode: 'insensitive' as const },
                        });
                    }
                    if (scope.teams?.length) {
                        filters.push({
                            [userFields.team!]: { in: scope.teams, mode: 'insensitive' as const },
                        });
                    }
                }

                return filters.length > 0 ? { AND: filters } : null;
            })
            .filter(Boolean);

        return permissionFilters.length > 0 ? { OR: permissionFilters } : null;
    }

    /**
     * Validate if a specific entity is accessible by the user
     * Used for single-entity operations (view, update, delete)
     */
    async validateResourceAccess(
        user: RbacUser,
        resource: PermissionResource,
        actions: PermissionAction[],
        targetEntity: any,
        options: RbacFilterOptions = {},
    ): Promise<void> {
        // Check permissions first
        const permissions = this.checkPermission(user, resource, actions);

        // If global permission, allow access
        const hasGlobalPermission = permissions.some((p) => !p.scope);
        if (hasGlobalPermission) {
            return;
        }

        // Check profile boundaries
        const profileFilter = this.buildProfileFilter(user, options);
        if (profileFilter && !this.matchesFilter(targetEntity, profileFilter, options)) {
            throw new ForbiddenException('Resource is outside your assigned profile scope');
        }

        // Check permission scopes
        const permissionFilter = this.buildPermissionScopesFilter(permissions, options);
        if (permissionFilter && !this.matchesFilter(targetEntity, permissionFilter, options)) {
            throw new ForbiddenException('Resource is outside your permitted scope');
        }
    }

    /**
     * Helper to check if an entity matches a filter
     */
    private matchesFilter(
        entity: any,
        filter: ScopeFilter,
        options: RbacFilterOptions = {},
    ): boolean {
        const { addressField } = options;

        if (filter.AND) {
            return filter.AND.every((subFilter) =>
                this.matchesFilter(entity, subFilter, options),
            );
        }

        if (filter.OR) {
            return filter.OR.some((subFilter) =>
                this.matchesFilter(entity, subFilter, options),
            );
        }

        // Check individual field conditions
        for (const [key, condition] of Object.entries(filter)) {
            if (key === 'AND' || key === 'OR') continue;

            let value: any;

            // Handle nested address fields
            if (addressField && key.startsWith(addressField)) {
                const fieldName = key.split('.')[1];
                value = entity[addressField]?.[fieldName] || entity.address?.[fieldName];
            } else {
                value = entity[key];
            }

            if (typeof condition === 'object' && condition !== null) {
                if ('in' in condition) {
                    const inValues = condition.in as string[];
                    const mode = condition.mode || 'default';
                    if (mode === 'insensitive') {
                        if (!inValues.some((v) => v.toLowerCase() === value?.toLowerCase())) {
                            return false;
                        }
                    } else {
                        if (!inValues.includes(value)) {
                            return false;
                        }
                    }
                } else if ('lte' in condition) {
                    if (!(value <= condition.lte)) {
                        return false;
                    }
                }
            } else {
                if (value !== condition) {
                    return false;
                }
            }
        }

        return true;
    }
}
