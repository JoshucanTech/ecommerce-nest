
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const states = await prisma.shippingAddress.findMany({
        select: { state: true },
        distinct: ['state']
    });
    console.log('Unique states in ShippingAddress:', states.map(s => s.state));

    const countries = await prisma.shippingAddress.findMany({
        select: { country: true },
        distinct: ['country']
    });
    console.log('Unique countries in ShippingAddress:', countries.map(c => c.country));
}

main().finally(() => prisma.$disconnect());
