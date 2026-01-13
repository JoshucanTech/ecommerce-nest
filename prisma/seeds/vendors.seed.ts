import { PrismaClient, UserRole, ApplicationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { LOCATIONS } from './shared';

export async function seedVendors(prisma: PrismaClient, salt: string) {
    console.log('Seeding Vendors (NG & USA)...');

    const vendorPassword = await bcrypt.hash('vendor123', salt);

    // --- Nigeria Vendors ---
    const ngVendors = [
        { name: 'Lagos Tech Hub', city: 'Lagos', state: 'Lagos', country: 'Nigeria', email: 'lagos.tech@example.com' },
        { name: 'Eko Fashion', city: 'Lagos', state: 'Lagos', country: 'Nigeria', email: 'eko.fashion@example.com' },
        { name: 'Abuja Electronics', city: 'Abuja', state: 'Federal Capital Territory', country: 'Nigeria', email: 'abuja.elec@example.com' },
        { name: 'Zuma Groceries', city: 'Abuja', state: 'Federal Capital Territory', country: 'Nigeria', email: 'zuma.groc@example.com' },
    ];

    for (const v of ngVendors) {
        await prisma.user.upsert({
            where: { email: v.email },
            update: {},
            create: {
                email: v.email,
                password: vendorPassword,
                firstName: v.name.split(' ')[0],
                lastName: 'Vendor',
                role: UserRole.VENDOR,
                emailVerified: true,
                vendor: {
                    create: {
                        businessName: v.name,
                        businessEmail: v.email,
                        businessPhone: '+234800000000',
                        isVerified: true,
                        slug: v.name.toLowerCase().replace(/ /g, '-'),
                        status: ApplicationStatus.APPROVED,
                        businessAddress: {
                            create: {
                                street: 'Main Street',
                                city: v.city,
                                state: v.state,
                                postalCode: '100001',
                                country: v.country,
                            }
                        }
                    }
                }
            }
        });
    }

    // --- USA Vendors ---
    const usaVendors = [
        { name: 'NY Style Central', city: 'New York City', state: 'New York', country: 'USA', email: 'ny.style@example.com' },
        { name: 'Silicon Valley Gadgets', city: 'San Francisco', state: 'California', country: 'USA', email: 'sv.gadgets@example.com' },
        { name: 'Austin BBQ Supply', city: 'Austin', state: 'Texas', country: 'USA', email: 'austin.bbq@example.com' },
        { name: 'Miami Beach Wear', city: 'Miami', state: 'Florida', country: 'USA', email: 'miami.beach@example.com' },
    ];

    for (const v of usaVendors) {
        await prisma.user.upsert({
            where: { email: v.email },
            update: {},
            create: {
                email: v.email,
                password: vendorPassword,
                firstName: v.name.split(' ')[0],
                lastName: 'Vendor',
                role: UserRole.VENDOR,
                emailVerified: true,
                vendor: {
                    create: {
                        businessName: v.name,
                        businessEmail: v.email,
                        businessPhone: '+1000000000',
                        isVerified: true,
                        slug: v.name.toLowerCase().replace(/ /g, '-'),
                        status: ApplicationStatus.APPROVED,
                        businessAddress: {
                            create: {
                                street: 'Business Ave',
                                city: v.city,
                                state: v.state,
                                postalCode: '90001',
                                country: v.country,
                            }
                        }
                    }
                }
            }
        });
    }

    console.log('Vendors seeding completed!');
}
