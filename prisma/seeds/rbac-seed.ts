import { PrismaClient, PermissionAction, PermissionResource } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding RBAC data...');

    // Define default permissions
    const permissionsData = [
        // User Management
        { name: 'view_users', action: PermissionAction.VIEW, resource: PermissionResource.USERS, category: 'User Management', description: 'View user list and details' },
        { name: 'create_users', action: PermissionAction.CREATE, resource: PermissionResource.USERS, category: 'User Management', description: 'Create new users' },
        { name: 'edit_users', action: PermissionAction.EDIT, resource: PermissionResource.USERS, category: 'User Management', description: 'Edit user information' },
        { name: 'delete_users', action: PermissionAction.DELETE, resource: PermissionResource.USERS, category: 'User Management', description: 'Delete users' },
        { name: 'manage_users', action: PermissionAction.MANAGE, resource: PermissionResource.USERS, category: 'User Management', description: 'Full user management access', level: 1 },

        // Vendor Management
        { name: 'view_vendors', action: PermissionAction.VIEW, resource: PermissionResource.VENDORS, category: 'Vendor Management', description: 'View vendor list and details' },
        { name: 'create_vendors', action: PermissionAction.CREATE, resource: PermissionResource.VENDORS, category: 'Vendor Management', description: 'Create new vendors' },
        { name: 'edit_vendors', action: PermissionAction.EDIT, resource: PermissionResource.VENDORS, category: 'Vendor Management', description: 'Edit vendor information' },
        { name: 'delete_vendors', action: PermissionAction.DELETE, resource: PermissionResource.VENDORS, category: 'Vendor Management', description: 'Delete vendors' },
        { name: 'approve_vendors', action: PermissionAction.APPROVE, resource: PermissionResource.VENDORS, category: 'Vendor Management', description: 'Approve vendor applications' },
        { name: 'reject_vendors', action: PermissionAction.REJECT, resource: PermissionResource.VENDORS, category: 'Vendor Management', description: 'Reject vendor applications' },
        { name: 'manage_vendors', action: PermissionAction.MANAGE, resource: PermissionResource.VENDORS, category: 'Vendor Management', description: 'Full vendor management access', level: 1 },

        // Rider Management
        { name: 'view_riders', action: PermissionAction.VIEW, resource: PermissionResource.RIDERS, category: 'Rider Management', description: 'View rider list and details' },
        { name: 'create_riders', action: PermissionAction.CREATE, resource: PermissionResource.RIDERS, category: 'Rider Management', description: 'Create new riders' },
        { name: 'edit_riders', action: PermissionAction.EDIT, resource: PermissionResource.RIDERS, category: 'Rider Management', description: 'Edit rider information' },
        { name: 'delete_riders', action: PermissionAction.DELETE, resource: PermissionResource.RIDERS, category: 'Rider Management', description: 'Delete riders' },
        { name: 'approve_riders', action: PermissionAction.APPROVE, resource: PermissionResource.RIDERS, category: 'Rider Management', description: 'Approve rider applications' },
        { name: 'reject_riders', action: PermissionAction.REJECT, resource: PermissionResource.RIDERS, category: 'Rider Management', description: 'Reject rider applications' },
        { name: 'manage_riders', action: PermissionAction.MANAGE, resource: PermissionResource.RIDERS, category: 'Rider Management', description: 'Full rider management access', level: 1 },

        // Order Management
        { name: 'view_orders', action: PermissionAction.VIEW, resource: PermissionResource.ORDERS, category: 'Order Management', description: 'View order list and details' },
        { name: 'create_orders', action: PermissionAction.CREATE, resource: PermissionResource.ORDERS, category: 'Order Management', description: 'Create new orders' },
        { name: 'edit_orders', action: PermissionAction.EDIT, resource: PermissionResource.ORDERS, category: 'Order Management', description: 'Edit order information' },
        { name: 'delete_orders', action: PermissionAction.DELETE, resource: PermissionResource.ORDERS, category: 'Order Management', description: 'Delete orders' },
        { name: 'manage_orders', action: PermissionAction.MANAGE, resource: PermissionResource.ORDERS, category: 'Order Management', description: 'Full order management access', level: 1 },
        { name: 'export_orders', action: PermissionAction.EXPORT, resource: PermissionResource.ORDERS, category: 'Order Management', description: 'Export order data' },

        // Product Management
        { name: 'view_products', action: PermissionAction.VIEW, resource: PermissionResource.PRODUCTS, category: 'Product Management', description: 'View product list and details' },
        { name: 'create_products', action: PermissionAction.CREATE, resource: PermissionResource.PRODUCTS, category: 'Product Management', description: 'Create new products' },
        { name: 'edit_products', action: PermissionAction.EDIT, resource: PermissionResource.PRODUCTS, category: 'Product Management', description: 'Edit product information' },
        { name: 'delete_products', action: PermissionAction.DELETE, resource: PermissionResource.PRODUCTS, category: 'Product Management', description: 'Delete products' },
        { name: 'manage_products', action: PermissionAction.MANAGE, resource: PermissionResource.PRODUCTS, category: 'Product Management', description: 'Full product management access', level: 1 },

        // Delivery Management
        { name: 'view_deliveries', action: PermissionAction.VIEW, resource: PermissionResource.DELIVERIES, category: 'Delivery Management', description: 'View delivery list and details' },
        { name: 'create_deliveries', action: PermissionAction.CREATE, resource: PermissionResource.DELIVERIES, category: 'Delivery Management', description: 'Create new deliveries' },
        { name: 'edit_deliveries', action: PermissionAction.EDIT, resource: PermissionResource.DELIVERIES, category: 'Delivery Management', description: 'Edit delivery information' },
        { name: 'delete_deliveries', action: PermissionAction.DELETE, resource: PermissionResource.DELIVERIES, category: 'Delivery Management', description: 'Delete deliveries' },
        { name: 'manage_deliveries', action: PermissionAction.MANAGE, resource: PermissionResource.DELIVERIES, category: 'Delivery Management', description: 'Full delivery management access', level: 1 },

        // Support Tickets
        { name: 'view_support_tickets', action: PermissionAction.VIEW, resource: PermissionResource.SUPPORT_TICKETS, category: 'Support Management', description: 'View support tickets' },
        { name: 'manage_support_tickets', action: PermissionAction.MANAGE, resource: PermissionResource.SUPPORT_TICKETS, category: 'Support Management', description: 'Manage support tickets', level: 1 },

        // Analytics
        { name: 'view_analytics', action: PermissionAction.VIEW, resource: PermissionResource.ANALYTICS, category: 'Analytics', description: 'View analytics and reports' },
        { name: 'export_analytics', action: PermissionAction.EXPORT, resource: PermissionResource.ANALYTICS, category: 'Analytics', description: 'Export analytics data' },

        // RBAC Management (Admin only)
        { name: 'view_permissions', action: PermissionAction.VIEW, resource: PermissionResource.PERMISSIONS, category: 'RBAC Management', description: 'View permissions', level: 2 },
        { name: 'manage_permissions', action: PermissionAction.MANAGE, resource: PermissionResource.PERMISSIONS, category: 'RBAC Management', description: 'Manage permissions', level: 3 },
        { name: 'view_roles', action: PermissionAction.VIEW, resource: PermissionResource.ROLES, category: 'RBAC Management', description: 'View roles', level: 2 },
        { name: 'manage_roles', action: PermissionAction.MANAGE, resource: PermissionResource.ROLES, category: 'RBAC Management', description: 'Manage roles', level: 3 },
        { name: 'view_sub_admins', action: PermissionAction.VIEW, resource: PermissionResource.SUB_ADMINS, category: 'RBAC Management', description: 'View sub-admins', level: 2 },
        { name: 'manage_sub_admins', action: PermissionAction.MANAGE, resource: PermissionResource.SUB_ADMINS, category: 'RBAC Management', description: 'Manage sub-admins', level: 3 },
    ];

    // Create permissions
    console.log('Creating permissions...');
    for (const permData of permissionsData) {
        await prisma.permission.upsert({
            where: { name: permData.name },
            update: permData,
            create: permData,
        });
    }

    // Define default roles
    const rolesData = [
        {
            name: 'Regional Manager',
            description: 'Manages users, vendors, and riders in assigned regions',
            permissions: [
                'view_users', 'edit_users',
                'view_vendors', 'edit_vendors', 'approve_vendors', 'reject_vendors',
                'view_riders', 'edit_riders', 'approve_riders', 'reject_riders',
                'view_orders', 'edit_orders',
                'view_deliveries', 'edit_deliveries',
                'view_analytics',
            ],
        },
        {
            name: 'Support Manager',
            description: 'Handles customer support and tickets',
            permissions: [
                'view_users',
                'view_orders',
                'view_support_tickets', 'manage_support_tickets',
            ],
        },
        {
            name: 'Content Manager',
            description: 'Manages products, categories, and advertisements',
            permissions: [
                'view_products', 'edit_products', 'create_products',
                'view_vendors',
            ],
        },
        {
            name: 'Operations Manager',
            description: 'Oversees deliveries and logistics',
            permissions: [
                'view_deliveries', 'edit_deliveries', 'manage_deliveries',
                'view_riders', 'edit_riders',
                'view_orders', 'edit_orders',
                'view_analytics',
            ],
        },
    ];

    // Create roles and assign permissions
    console.log('Creating roles...');
    for (const roleData of rolesData) {
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: { description: roleData.description },
            create: {
                name: roleData.name,
                description: roleData.description,
            },
        });

        // Assign permissions to role
        for (const permName of roleData.permissions) {
            const permission = await prisma.permission.findUnique({
                where: { name: permName },
            });

            if (permission) {
                await prisma.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: role.id,
                            permissionId: permission.id,
                        },
                    },
                    update: {},
                    create: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                });
            }
        }
    }

    console.log('RBAC seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
