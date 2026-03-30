import { PrismaClient, UserRole, ApplicationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

export async function seedStorefronts(prisma: PrismaClient, salt: string) {
    console.log('Seeding Branded Storefronts...');

    const vendors = [
        { name: 'Nike', slug: 'nike', theme: '#000000', accent: '#FFFFFF', tagline: 'Just Do It', bio: 'The world\'s leading athletic brand.' },
        { name: 'Apple', slug: 'apple', theme: '#555555', accent: '#FFFFFF', tagline: 'Think Different', bio: 'Innovation that moves the world.' },
        { name: 'Samsung', slug: 'samsung', theme: '#034EA2', accent: '#FFFFFF', tagline: 'Imagine the Possibilities', bio: 'Inspire the world, create the future.' },
        { name: 'Adidas', slug: 'adidas', theme: '#000000', accent: '#FFFFFF', tagline: 'Impossible is Nothing', bio: 'Through sport, we have the power to change lives.' },
        { name: 'Sony', slug: 'sony', theme: '#000000', accent: '#D4AF37', tagline: 'Make.Believe', bio: 'Creative Entertainment Company with a Solid Foundation of Technology.' },
        { name: 'IKEA', slug: 'ikea', theme: '#0051BA', accent: '#FFDA1A', tagline: 'Design for Everyone', bio: 'To create a better everyday life for the many people.' },
        { name: 'Lego', slug: 'lego', theme: '#D11013', accent: '#FFFFFF', tagline: 'Play Well', bio: 'Inspiring and developing the builders of tomorrow.' },
        { name: 'GamingZone', slug: 'gamingzone', theme: '#6200EE', accent: '#03DAC6', tagline: 'Level Up Your Game', bio: 'Your ultimate destination for all things gaming.' },
        { name: 'EcoLiving', slug: 'ecoliving', theme: '#2E7D32', accent: '#F1F8E9', tagline: 'Live Sustainably', bio: 'Sustainable products for a greener planet.' },
        { name: 'LuxuryWatch', slug: 'luxurywatch', theme: '#BF9B30', accent: '#1C1C1C', tagline: 'Timeless Elegance', bio: 'Exquisite timepieces for the discerning collector.' },
    ];

    // Get categories to associate products with
    const categories = await prisma.category.findMany();
    if (categories.length === 0) {
        console.warn('No categories found. Products will be created without category associations.');
    }

    const password = await bcrypt.hash('password123', salt);

    for (const v of vendors) {
        const email = `${v.slug}@example.com`;
        
        // Use upsert and then manual fetch to avoid complex include types in loops if needed, 
        // but let's try to do it right.
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password,
                firstName: v.name,
                lastName: 'Official',
                role: UserRole.VENDOR,
                emailVerified: true,
                vendor: {
                    create: {
                        businessName: v.name,
                        businessEmail: email,
                        businessPhone: faker.phone.number(),
                        businessLogo: `https://api.dicebear.com/7.x/initials/svg?seed=${v.name}&backgroundColor=${v.theme.replace('#', '')}`,
                        coverImage: faker.image.urlLoremFlickr({ category: 'abstract', width: 1200, height: 400 }),
                        description: v.bio,
                        isVerified: true,
                        slug: v.slug,
                        status: ApplicationStatus.APPROVED,
                        themeColor: v.theme,
                        accentColor: v.accent,
                        tagline: v.tagline,
                        businessAddress: {
                            create: {
                                street: faker.location.streetAddress(),
                                city: faker.location.city(),
                                state: faker.location.state(),
                                postalCode: faker.location.zipCode(),
                                country: 'USA',
                            }
                        }
                    }
                }
            }
        });

        // Fetch vendor separately to be safe with types
        const vendorRecord = await prisma.vendor.findUnique({
            where: { userId: user.id }
        });

        if (!vendorRecord) continue;

        const vendorId = vendorRecord.id;

        // Create 10 products for each vendor
        for (let i = 0; i < 10; i++) {
            const productName = `${v.name} ${faker.commerce.productName()}`;
            const price = parseFloat(faker.commerce.price({ min: 50, max: 1000 }));
            
            await prisma.product.create({
                data: {
                    name: productName,
                    slug: `${faker.helpers.slugify(productName.toLowerCase())}-${faker.string.alphanumeric(5)}`,
                    description: faker.commerce.productDescription(),
                    price,
                    discountPrice: Math.random() > 0.5 ? price * 0.8 : null,
                    quantity: faker.number.int({ min: 10, max: 100 }),
                    sku: faker.string.alphanumeric(10).toUpperCase(),
                    images: [
                        faker.image.urlLoremFlickr({ category: 'products', width: 640, height: 640 }),
                        faker.image.urlLoremFlickr({ category: 'technics', width: 640, height: 640 })
                    ],
                    isPublished: true,
                    vendorId,
                    soldCount: faker.number.int({ min: 0, max: 500 }),
                    viewCount: faker.number.int({ min: 0, max: 2000 }),
                    ...(categories.length > 0 && {
                        category: {
                            connect: [{ id: categories[Math.floor(Math.random() * categories.length)].id }]
                        }
                    }),
                    inventory: {
                        create: {
                            quantity: faker.number.int({ min: 10, max: 100 }),
                            vendorId,
                            lowStockThreshold: 5
                        }
                    }
                }
            });
        }
    }

    console.log('Branded Storefronts seeding completed!');
}
