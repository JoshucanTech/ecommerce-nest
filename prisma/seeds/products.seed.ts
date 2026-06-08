import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { getRandomOrg } from './shared';

/**
 * Helper function to map vendor business names to realistic, industry-specific category names.
 */
function getCategoryNamesForVendor(businessName: string): string[] {
    const lowerName = businessName.toLowerCase();
    
    // Tech & Electronics
    if (lowerName.includes('tech') || lowerName.includes('gadget') || lowerName.includes('electronic') || lowerName.includes('silicon')) {
        return ['Smartphones & Tablets', 'Laptops & Computers', 'Audio & Headphones', 'Wearable Tech', 'Smart Home Devices'];
    }
    // Fashion & Apparel
    if (lowerName.includes('fashion') || lowerName.includes('style') || lowerName.includes('wear') || lowerName.includes('apparel')) {
        return ['Designer Apparel', 'Footwear Collection', 'Fashion Accessories', 'Bags & Luggage', 'Activewear & Sportswear'];
    }
    // Groceries & Food
    if (lowerName.includes('grocer') || lowerName.includes('food') || lowerName.includes('bbq') || lowerName.includes('supply')) {
        return ['Fresh Produce', 'Gourmet Snacks', 'Beverages & Drinks', 'Grilling Essentials', 'Spices & Condiments'];
    }
    // Fallback/Generic
    return ['Best Sellers', 'New Arrivals', 'Featured Products', 'Special Deals', 'Clearance Items'];
}

export async function seedProducts(prisma: PrismaClient) {
    console.log('Seeding Products with Org Metadata and Vendor-Specific Categories...');

    // Fetch all vendors in the system
    const vendors = await prisma.vendor.findMany();

    if (vendors.length === 0) {
        console.warn('No vendors found. Skipping product seeding.');
        return;
    }

    for (const vendor of vendors) {
        console.log(`Seeding custom categories and products for vendor: ${vendor.businessName}`);
        
        // 1. Get 5 custom category names tailored to this vendor's business sector
        const categoryNames = getCategoryNamesForVendor(vendor.businessName);

        for (let catIndex = 0; catIndex < categoryNames.length; catIndex++) {
            const categoryName = categoryNames[catIndex];
            const categorySlug = `${faker.helpers.slugify(categoryName.toLowerCase())}-${vendor.id.substring(0, 8)}-${catIndex}`;

            // Create or fetch the vendor-specific category
            const category = await prisma.category.upsert({
                where: { slug: categorySlug },
                update: {},
                create: {
                    name: categoryName,
                    description: `${categoryName} tailored collection for ${vendor.businessName}.`,
                    image: faker.image.urlLoremFlickr({ category: 'business' }),
                    slug: categorySlug,
                    vendorId: vendor.id,
                    userId: vendor.userId, // Link to the vendor's user account
                }
            });

            // 2. Create exactly 10 premium products for this category
            for (let prodIndex = 1; prodIndex <= 10; prodIndex++) {
                const org = getRandomOrg();
                const name = `${faker.commerce.productName()} - ${category.name.split(' ')[0]}`;
                const price = parseFloat(faker.commerce.price({ min: 15, max: 1500 }));
                const discountPrice = price > 50 ? price * 0.85 : null; // 15% discount for items over $50
                const sku = `PROD-${vendor.businessName.substring(0, 3).toUpperCase()}-${catIndex}${prodIndex}-${faker.string.alphanumeric(4).toUpperCase()}`;
                
                await prisma.product.create({
                    data: {
                        name,
                        slug: `${faker.helpers.slugify(name.toLowerCase())}-${faker.string.alphanumeric(6).toLowerCase()}`,
                        description: faker.commerce.productDescription(),
                        price,
                        discountPrice,
                        quantity: faker.number.int({ min: 20, max: 800 }),
                        sku,
                        images: [
                            faker.image.urlLoremFlickr({ category: 'product' }),
                            faker.image.urlLoremFlickr({ category: 'technics' })
                        ],
                        isPublished: true,
                        vendorId: vendor.id,
                        attributes: {
                            department: org.department,
                            team: org.team,
                            color: faker.color.human(),
                            material: faker.commerce.productMaterial(),
                            condition: 'New',
                        },
                        categories: {
                            connect: [{ id: category.id }]
                        },
                        inventory: {
                            create: {
                                quantity: faker.number.int({ min: 20, max: 800 }),
                                vendorId: vendor.id,
                                lowStockThreshold: 10
                            }
                        }
                    }
                });
            }
        }
    }

    console.log('Products and vendor-specific categories seeding completed!');
}
