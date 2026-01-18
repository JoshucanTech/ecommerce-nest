import { UserRole, Permission, SubAdminProfile } from '@prisma/client';

export interface RbacFilterOptions {
    includeLocation?: boolean;
    includeOrganization?: boolean;
    includeLevel?: boolean;
    addressField?: string; // For orders: 'shippingAddress' or 'address'
    userFields?: {
        city?: string;
        state?: string;
        country?: string;
        region?: string;
        department?: string;
        team?: string;
    };
}

export interface RbacUser {
    id: string;
    role: UserRole;
    positions: Array<{
        positionPermissions: Array<{
            permission: Permission;
        }>;
    }>;
    subAdminProfile?: SubAdminProfile | null;
}

export interface ScopeFilter {
    AND?: any[];
    OR?: any[];
    [key: string]: any;
}

export interface LocationScope {
    cities?: string[];
    states?: string[];
    regions?: string[];
    countries?: string[];
}

export interface OrganizationalScope {
    departments?: string[];
    teams?: string[];
}

export interface PermissionScope {
    location?: LocationScope;
    departments?: string[];
    teams?: string[];
}
