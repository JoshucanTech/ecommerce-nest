
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Sub-Admin Organizational Scopes ---');

    // 1. Find or Create a Sub-Admin for testing
    // We'll use the existing one if we know the ID, or look for a sub-admin
    const subAdmin = await prisma.user.findFirst({
        where: { role: 'SUB_ADMIN' },
        include: { subAdminProfile: true }
    });

    if (!subAdmin) {
        console.log('No sub-admin found. Please create one in Prisma Studio.');
        return;
    }

    console.log(`Found Sub-Admin: ${subAdmin.email}`);

    // Update sub-admin profile with a specific department if empty
    if (subAdmin.subAdminProfile && subAdmin.subAdminProfile.departments.length === 0) {
        console.log('Assigning "Logistics" department to Sub-Admin profile...');
        await prisma.subAdminProfile.update({
            where: { userId: subAdmin.id },
            data: { departments: ['Logistics'] }
        });
    }

    // 2. Create test users with different departments
    console.log('Checking test users...');

    // Note: These fields might fail if prisma generate hasn't successfully updated the client types
    // but if the db push worked, the columns exist.
    // We use any to bypass type checks in this script for now.
    const usersToCreate = [
        { email: 'logistic_user@test.com', firstName: 'Logistics', lastName: 'User', department: 'Logistics', role: 'BUYER' },
        { email: 'finance_user@test.com', firstName: 'Finance', lastName: 'User', department: 'Finance', role: 'BUYER' }
    ];

    for (const userData of usersToCreate) {
        const existing = await prisma.user.findUnique({ where: { email: userData.email } });
        if (!existing) {
            console.log(`Creating test user: ${userData.email} (${userData.department})`);
            try {
                await (prisma.user as any).create({ data: userData });
            } catch (e) {
                console.error(`Failed to create user ${userData.email}:`, e.message);
            }
        } else {
            // Update existing user's department
            await (prisma.user as any).update({
                where: { id: existing.id },
                data: { department: userData.department }
            });
        }
    }

    console.log('\n--- Final Assignments ---');
    const subAdminUpdated = await prisma.user.findFirst({
        where: { id: subAdmin.id },
        include: { subAdminProfile: true }
    });
    console.log('Sub-Admin Departments:', subAdminUpdated.subAdminProfile?.departments);

    const logisticsUsers = await (prisma.user as any).findMany({
        where: { department: 'Logistics' }
    });
    console.log('Users in Logistics:', logisticsUsers.length);

    console.log('\nYou can now log in as the Sub-Admin and verify they ONLY see the Logistics users.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
