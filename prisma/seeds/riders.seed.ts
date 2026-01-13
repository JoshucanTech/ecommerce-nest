import { PrismaClient, UserRole, VehicleType, ApplicationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { getRandomLocation } from './shared';

export async function seedRiders(prisma: PrismaClient, salt: string) {
    console.log('Seeding Riders (NG & USA)...');

    const riderPassword = await bcrypt.hash('rider123', salt);

    // --- Nigeria Riders ---
    for (let i = 1; i <= 4; i++) {
        const loc = getRandomLocation('NIGERIA');
        const email = `ng.rider${i}@example.com`;

        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password: riderPassword,
                firstName: `NG Rider ${i}`,
                lastName: 'Logistic',
                role: UserRole.RIDER,
                emailVerified: true,
                rider: {
                    create: {
                        vehicleType: i % 2 === 0 ? VehicleType.MOTORCYCLE : VehicleType.BICYCLE,
                        vehiclePlate: `NG-${i}00X`,
                        licenseNumber: `LIC-NG-${i}00X`,
                        isVerified: true,
                        isAvailable: true,
                        status: ApplicationStatus.APPROVED,
                        currentLatitude: loc.lat,
                        currentLongitude: loc.lng,
                    }
                }
            }
        });
    }

    // --- USA Riders ---
    for (let i = 1; i <= 4; i++) {
        const loc = getRandomLocation('USA');
        const email = `usa.rider${i}@example.com`;

        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password: riderPassword,
                firstName: `USA Rider ${i}`,
                lastName: 'Logistic',
                role: UserRole.RIDER,
                emailVerified: true,
                rider: {
                    create: {
                        vehicleType: i % 2 === 0 ? VehicleType.CAR : VehicleType.VAN,
                        vehiclePlate: `USA-${i}00X`,
                        licenseNumber: `LIC-USA-${i}00X`,
                        isVerified: true,
                        isAvailable: true,
                        status: ApplicationStatus.APPROVED,
                        currentLatitude: loc.lat,
                        currentLongitude: loc.lng,
                    }
                }
            }
        });
    }

    console.log('Riders seeding completed!');
}
