
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const subAdminEmail = 'subAdmin2@example.com';
    const user = await prisma.user.findUnique({
        where: { email: subAdminEmail },
        include: {
            subAdminProfile: true,
            positions: {
                include: {
                    positionPermissions: {
                        include: { permission: true }
                    }
                }
            }
        }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    const profileStates = user.subAdminProfile?.allowedStates || [];
    const profileCountries = user.subAdminProfile?.allowedCountries || [];

    console.log('User Profile States:', profileStates);
    console.log('User Profile Countries:', profileCountries);

    const countries = [...profileCountries];
    const states = [...profileStates];

    const locationFilter = {
        OR: [
            ...(states.length > 0 ? [{ state: { in: states, mode: 'insensitive' as any } }] : []),
            ...(countries.length > 0 ? [{ country: { in: countries, mode: 'insensitive' as any } }] : []),
        ],
    };

    const orders = await prisma.order.findMany({
        where: {
            OR: [
                { shippingAddress: locationFilter },
                { address: locationFilter }
            ]
        },
        include: {
            shippingAddress: true,
            address: true
        }
    });

    console.log(`Matched ${orders.length} orders total.`);

    // Now let's see why they matched
    for (const o of orders) {
        const sAddr = o.shippingAddress;
        const addr = o.address;

        const sMatchCountry = sAddr && countries.some(c => c.toLowerCase() === sAddr.country?.toLowerCase());
        const sMatchState = sAddr && states.some(s => s.toLowerCase() === sAddr.state?.toLowerCase());
        const aMatchCountry = addr && countries.some(c => c.toLowerCase() === addr.country?.toLowerCase());
        const aMatchState = addr && states.some(s => s.toLowerCase() === addr.state?.toLowerCase());

        console.log(`Order ${o.orderNumber}:`);
        console.log(`  Shipping: ${sAddr?.city}, ${sAddr?.state}, ${sAddr?.country} [Match: C=${sMatchCountry}, S=${sMatchState}]`);
        console.log(`  Address: ${addr?.city}, ${addr?.state}, ${addr?.country} [Match: C=${aMatchCountry}, S=${aMatchState}]`);
    }
}

main().finally(() => prisma.$disconnect());
