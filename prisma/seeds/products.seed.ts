import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { getRandomOrg } from './shared';

export async function seedProducts(prisma: PrismaClient) {
    console.log('Seeding Products with Org Metadata...');

    const vendors = await prisma.vendor.findMany();
    const categories = await prisma.category.findMany();

    if (vendors.length === 0 || categories.length === 0) {
        console.warn('No vendors or categories found. Skipping product seeding.');
        return;
    }

    for (const vendor of vendors) {
        // Create 3 products per vendor
        for (let i = 1; i <= 3; i++) {
            const org = getRandomOrg();
            const name = faker.commerce.productName();
            const price = parseFloat(faker.commerce.price({ min: 10, max: 1000 }));

            await prisma.product.create({
                data: {
                    name,
                    slug: faker.helpers.slugify(name.toLowerCase() + '-' + Math.random().toString(36).substring(7)),
                    description: faker.commerce.productDescription(),
                    price,
                    discountPrice: price * 0.9,
                    quantity: faker.number.int({ min: 10, max: 500 }),
                    sku: faker.string.alphanumeric(10).toUpperCase(),
                    isPublished: true,
                    vendorId: vendor.id,
                    attributes: {
                        department: org.department,
                        team: org.team,
                        color: faker.color.human(),
                        material: faker.commerce.productMaterial(),
                    },
                    category: {
                        connect: [{ id: categories[Math.floor(Math.random() * categories.length)].id }]
                    },
                    inventory: {
                        create: {
                            quantity: faker.number.int({ min: 10, max: 500 }),
                            vendorId: vendor.id,
                            lowStockThreshold: 5
                        }
                    }
                }
            });
        }
    }

    console.log('Products seeding completed!');
}
