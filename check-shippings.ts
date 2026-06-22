import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const shippings = await prisma.shipping.findMany();
    const vendorShippings = await prisma.vendorShipping.findMany({
      include: {
        shipping: true,
        vendor: true,
      }
    });
    const vendors = await prisma.vendor.findMany();

    console.log('--- Shippings ---');
    console.log(JSON.stringify(shippings, null, 2));
    
    console.log('--- Vendor Shippings ---');
    console.log(JSON.stringify(vendorShippings, null, 2));

    console.log('--- Vendors ---');
    console.log(JSON.stringify(vendors.map(v => ({ id: v.id, name: v.businessName })), null, 2));
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main().finally(() => prisma.$disconnect());
