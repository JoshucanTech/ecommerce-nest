
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { role: 'SUB_ADMIN' },
        select: {
            id: true,
            email: true,
            positions: {
                select: {
                    name: true,
                    positionPermissions: {
                        select: {
                            permission: {
                                select: {
                                    name: true,
                                    resource: true,
                                    action: true,
                                    scope: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
