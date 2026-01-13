import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

export async function seedAnalytics(prisma: PrismaClient) {
    console.log('Seeding Analytics & Audit Logs...');

    const subAdmins = await prisma.user.findMany({ where: { role: 'ADMIN' } }); // Assuming sub-admins have ADMIN role in UserRole for now or linked to SubAdminProfile

    if (subAdmins.length === 0) {
        console.warn('No sub-admins found for analytics seeding.');
        return;
    }

    const actions = [
        'VIEW_ORDERS', 'EDIT_PRODUCT', 'APPROVE_VENDOR',
        'CREATE_PERMISSION', 'DELETE_RIDER', 'LOGIN',
        'UPDATE_SCOPE', 'EXPORT_ANALYTICS'
    ];

    const resources = [
        'ORDERS', 'PRODUCTS', 'VENDORS',
        'PERMISSIONS', 'RIDERS', 'AUTH',
        'SUB_ADMIN_PROFILES', 'ANALYTICS'
    ];

    for (const admin of subAdmins) {
        // Create 10 logs per admin
        for (let i = 0; i < 10; i++) {
            await prisma.auditLog.create({
                data: {
                    userId: admin.id,
                    action: actions[Math.floor(Math.random() * actions.length)],
                    resource: resources[Math.floor(Math.random() * resources.length)],
                    resourceId: faker.string.uuid(),
                    changes: {
                        before: { status: 'PENDING' },
                        after: { status: 'APPROVED' }
                    },
                    ipAddress: faker.internet.ip(),
                    userAgent: faker.internet.userAgent(),
                    createdAt: faker.date.recent({ days: 30 })
                }
            });
        }
    }

    console.log('Analytics seeding completed!');
}
