
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

    const profileCities = user.subAdminProfile?.allowedCities || [];
    const profileStates = user.subAdminProfile?.allowedStates || [];
    const profileCountries = user.subAdminProfile?.allowedCountries || [];

    const permissions = user.positions.flatMap(p => p.positionPermissions.map(pp => pp.permission));
    const orderPermissions = permissions.filter(p => p.resource === 'ORDERS');

    const cities = [...profileCities];
    const states = [...profileStates];
    const countries = [...profileCountries];

    for (const p of orderPermissions) {
        const scope = p.scope as any;
        if (scope?.location?.cities) cities.push(...scope.location.cities);
        if (scope?.location?.states) states.push(...scope.location.states);
        if (scope?.location?.countries) countries.push(...scope.location.countries);
    }

    console.log('Combined Scopes:', { cities, states, countries });

    const locationFilter = {
        OR: [
            ...(cities.length > 0 ? [{ city: { in: cities, mode: 'insensitive' as any } }] : []),
            ...(states.length > 0 ? [{ state: { in: states, mode: 'insensitive' as any } }] : []),
            ...(countries.length > 0 ? [{ country: { in: countries, mode: 'insensitive' as any } }] : []),
        ],
    };

    const where = {
        OR: [
            { shippingAddress: locationFilter },
            { address: locationFilter }
        ]
    };

    const orders = await prisma.order.findMany({
        where,
        include: {
            shippingAddress: true,
            address: true
        }
    });

    console.log(`Found ${orders.length} orders`);
    orders.forEach(o => {
        console.log(`Order ${o.orderNumber}: ShippingState: ${o.shippingAddress?.state}, AddressState: ${o.address?.state}, Country: ${o.shippingAddress?.country || o.address?.country}`);
    });
}

main().finally(() => prisma.$disconnect());
