import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { LOCATIONS } from './shared';

export async function seedOrders(prisma: PrismaClient) {
    console.log('Seeding Orders for Geo-Scope Testing...');

    const buyers = await prisma.user.findMany({ where: { role: 'BUYER' } });
    const products = await prisma.product.findMany();
    const vendors = await prisma.vendor.findMany({ include: { businessAddress: true } });

    if (buyers.length === 0 || products.length === 0 || vendors.length === 0) {
        console.warn('Missing data for orders. Skipping.');
        return;
    }

    // --- Create Orders in Nigeria (Lagos & Abuja) ---
    const ngLocations = [
        { city: 'Ikeja', state: 'Lagos', country: 'Nigeria' },
        { city: 'Abuja', state: 'Federal Capital Territory', country: 'Nigeria' },
    ];

    for (const loc of ngLocations) {
        for (let i = 1; i <= 3; i++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const buyer = buyers[Math.floor(Math.random() * buyers.length)];

            await prisma.order.create({
                data: {
                    orderNumber: `ORD-NG-${loc.city.toUpperCase()}-${i}-${Math.random().toString(36).substring(7)}`,
                    user: { connect: { id: buyer.id } },
                    vendor: product.vendorId ? { connect: { id: product.vendorId } } : undefined,
                    totalAmount: product.price,
                    status: OrderStatus.PENDING,
                    paymentStatus: PaymentStatus.PENDING,
                    paymentMethod: 'CREDIT_CARD',
                    subtotal: product.price,
                    total: product.price,
                    shippingAddress: {
                        create: {
                            street: faker.location.streetAddress(),
                            city: loc.city,
                            state: loc.state,
                            country: loc.country,
                            postalCode: '100001',
                            userId: buyer.id
                        }
                    },
                    items: {
                        create: {
                            product: { connect: { id: product.id } },
                            quantity: 1,
                            unitPrice: product.price,
                            totalPrice: product.price,
                        }
                    }
                }
            });
        }
    }

    // --- Create Orders in USA (NY, CA, TX, FL) ---
    const usaLocations = [
        { city: 'New York City', state: 'New York', country: 'USA' },
        { city: 'San Francisco', state: 'California', country: 'USA' },
        { city: 'Austin', state: 'Texas', country: 'USA' },
        { city: 'Miami', state: 'Florida', country: 'USA' },
    ];

    for (const loc of usaLocations) {
        for (let i = 1; i <= 2; i++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const buyer = buyers[Math.floor(Math.random() * buyers.length)];

            await prisma.order.create({
                data: {
                    orderNumber: `ORD-USA-${loc.state.toUpperCase()}-${i}-${Math.random().toString(36).substring(7)}`,
                    user: { connect: { id: buyer.id } },
                    vendor: product.vendorId ? { connect: { id: product.vendorId } } : undefined,
                    totalAmount: product.price,
                    status: OrderStatus.PENDING,
                    paymentStatus: PaymentStatus.PENDING,
                    paymentMethod: 'CREDIT_CARD',
                    subtotal: product.price,
                    total: product.price,
                    shippingAddress: {
                        create: {
                            street: faker.location.streetAddress(),
                            city: loc.city,
                            state: loc.state,
                            country: loc.country,
                            postalCode: '90210',
                            userId: buyer.id
                        }
                    },
                    items: {
                        create: {
                            product: { connect: { id: product.id } },
                            quantity: 1,
                            unitPrice: product.price,
                            totalPrice: product.price,
                        }
                    }
                }
            });
        }
    }

    console.log('Orders seeding completed!');
}
