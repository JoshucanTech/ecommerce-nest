
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const result = await prisma.shippingAddress.findMany({
        where: {
            state: { in: ['Lagos'], mode: 'insensitive' as any }
        }
    });
    console.log(`Found ${result.length} addresses with state Lagos`);
}

main().finally(() => prisma.$disconnect());
