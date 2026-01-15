
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const result = await prisma.shippingAddress.findMany({
        where: {
            state: { in: ['lagos'], mode: 'insensitive' as any }
        }
    });
    console.log(`Searching for 'lagos' (lower). Found ${result.length} addresses.`);

    const result2 = await prisma.shippingAddress.findMany({
        where: {
            state: { in: ['LAGOS'], mode: 'insensitive' as any }
        }
    });
    console.log(`Searching for 'LAGOS' (upper). Found ${result2.length} addresses.`);

    const exact = await prisma.shippingAddress.findMany({
        where: {
            state: { in: ['Lagos'] }
        }
    });
    console.log(`Searching for 'Lagos' (exact). Found ${exact.length} addresses.`);
}

main().finally(() => prisma.$disconnect());
