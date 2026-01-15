
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Attempt to query with 'in' and 'mode: insensitive' which is often invalid for 'in'
        const result = await prisma.order.findMany({
            where: {
                shippingAddress: {
                    OR: [
                        { state: { in: ['Lagos'], mode: 'insensitive' as any } }
                    ]
                }
            },
            take: 1
        });
        console.log('Query successful');
    } catch (e: any) {
        console.log('Query failed:', e.message);
    }
}

main().finally(() => prisma.$disconnect());
