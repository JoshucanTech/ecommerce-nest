
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'subAdmin2@example.com' },
        include: {
            subAdminProfile: true,
            positions: {
                include: {
                    positionPermissions: {
                        include: {
                            permission: true
                        }
                    }
                }
            }
        }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('User:', user.email);
    console.log('Role:', user.role);
    console.log('Profile Scopes:', {
        cities: user.subAdminProfile?.allowedCities,
        states: user.subAdminProfile?.allowedStates,
        countries: user.subAdminProfile?.allowedCountries
    });

    console.log('Permissions:');
    user.positions.forEach(pos => {
        pos.positionPermissions.forEach(pp => {
            console.log(`- ${pp.permission.resource}:${pp.permission.action}, Scope: ${JSON.stringify(pp.permission.scope)}`);
        });
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
