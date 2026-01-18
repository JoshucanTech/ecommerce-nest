
import { PrismaClient, PermissionAction, PermissionResource } from '@prisma/client';

const prisma = new PrismaClient();

const resourceNames: Record<PermissionResource, string> = {
    [PermissionResource.USERS]: 'User',
    [PermissionResource.VENDORS]: 'Vendor',
    [PermissionResource.RIDERS]: 'Rider',
    [PermissionResource.ORDERS]: 'Order',
    [PermissionResource.PRODUCTS]: 'Product',
    [PermissionResource.DELIVERIES]: 'Delivery',
    [PermissionResource.PAYMENTS]: 'Payment',
    [PermissionResource.ANALYTICS]: 'Analytics',
    [PermissionResource.SETTINGS]: 'Settings',
    [PermissionResource.PERMISSIONS]: 'Permission',
    [PermissionResource.POSITIONS]: 'Position',
    [PermissionResource.SUB_ADMINS]: 'Sub-Admin',
    [PermissionResource.SUPPORT_TICKETS]: 'Support Ticket',
    [PermissionResource.ADVERTISEMENTS]: 'Advertisement',
    [PermissionResource.CATEGORIES]: 'Category',
    [PermissionResource.REVIEWS]: 'Review',
};

const actionNames: Record<PermissionAction, string> = {
    [PermissionAction.VIEW]: 'View',
    [PermissionAction.CREATE]: 'Create',
    [PermissionAction.EDIT]: 'Edit',
    [PermissionAction.DELETE]: 'Delete',
    [PermissionAction.MANAGE]: 'Manage',
    [PermissionAction.APPROVE]: 'Approve',
    [PermissionAction.REJECT]: 'Reject',
    [PermissionAction.EXPORT]: 'Export',
    [PermissionAction.IMPORT]: 'Import',
};

const resourceCategories: Record<PermissionResource, string> = {
    [PermissionResource.USERS]: 'User Management',
    [PermissionResource.VENDORS]: 'Vendor Management',
    [PermissionResource.RIDERS]: 'Rider Management',
    [PermissionResource.ORDERS]: 'Order Management',
    [PermissionResource.PRODUCTS]: 'Product Management',
    [PermissionResource.DELIVERIES]: 'Logistics',
    [PermissionResource.PAYMENTS]: 'Financials',
    [PermissionResource.ANALYTICS]: 'Reporting',
    [PermissionResource.SETTINGS]: 'System Settings',
    [PermissionResource.PERMISSIONS]: 'Access Control',
    [PermissionResource.POSITIONS]: 'Access Control',
    [PermissionResource.SUB_ADMINS]: 'Access Control',
    [PermissionResource.SUPPORT_TICKETS]: 'Support',
    [PermissionResource.ADVERTISEMENTS]: 'Marketing',
    [PermissionResource.CATEGORIES]: 'Product Management',
    [PermissionResource.REVIEWS]: 'Feedback',
};

async function main() {
    console.log('--- Generating Granular Permissions Seed ---');

    for (const resource of Object.values(PermissionResource)) {
        for (const action of Object.values(PermissionAction)) {
            const resourceLabel = resourceNames[resource] || resource;
            const actionLabel = actionNames[action] || action;

            // Name format: action_resource (lowercase)
            const name = `${action.toLowerCase()}_${resource.toLowerCase()}`;
            // Description format: Action Resource (e.g. View Order)
            const description = `${actionLabel} ${resourceLabel}`;
            const category = resourceCategories[resource] || 'General';

            console.log(`Upserting: ${name} -> ${description} (${category})`);

            await prisma.permission.upsert({
                where: { name },
                update: {
                    action,
                    resource,
                    description,
                    category,
                },
                create: {
                    name,
                    action,
                    resource,
                    description,
                    category,
                },
            });
        }
    }

    console.log('--- Granular Permissions Seeding Completed ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
