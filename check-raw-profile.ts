
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const profile = await prisma.subAdminProfile.findFirst({
        where: { user: { email: 'subAdmin2@example.com' } }
    });
    console.log('Profile States:', JSON.stringify(profile?.allowedStates));
    console.log('Profile Countries:', JSON.stringify(profile?.allowedCountries));
}

main().finally(() => prisma.$disconnect());
