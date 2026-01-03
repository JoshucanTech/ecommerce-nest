import {
  PrismaClient,
  UserRole,
  VehicleType,
  PaymentMethod,
  OrderStatus,
  DeliveryStatus,
  NotificationType,
  DiscountType,
  PaymentStatus,
  PaymentType,
  AdStatus,
  AdType,
  PricingModel,
  AdPlatform,
  ApplicationStatus,
} from '@prisma/client';

import * as bcrypt from 'bcryptjs';
// const bcrypt = require('bcryptjs');

import { faker, LoremModule } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  // Clean database
  await prisma.messageReaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.adUserInteraction.deleteMany();
  await prisma.adAnalytics.deleteMany();
  await prisma.adPayment.deleteMany();
  await prisma.adPlatformReference.deleteMany();
  await prisma.adTargeting.deleteMany();
  await prisma.productAdvertisement.deleteMany();
  await prisma.advertisement.deleteMany();
  await prisma.adPlatformConfig.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderShipping.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.flashSaleItem.deleteMany();
  await prisma.flashSale.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.recentlyViewedProduct.deleteMany();
  await prisma.shippingZone.deleteMany();
  await prisma.shippingOption.deleteMany();
  await prisma.shippingPolicy.deleteMany();
  await prisma.vendorShipping.deleteMany();
  await prisma.shipping.deleteMany();
  await prisma.sharedAddress.deleteMany();
  await prisma.shippingAddress.deleteMany();
  await prisma.productFeature.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.productInBox.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.rider.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding database...');
  console.log('bcrypt', bcrypt);

  // Create admin user
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      emailVerified: true,
      profile: {
        create: {
          bio: 'System administrator',
        },
      },
      settings: {
        create: {},
      },
    },
  });
  console.log('Created admin user:', admin.email);

  // Create sub-admin user
  const subAdminPassword = await bcrypt.hash('subAdmin123', salt);
  const subAdmin = await prisma.user.create({
    data: {
      email: 'subAdmin@example.com',
      password: subAdminPassword,
      firstName: 'SubAdmin',
      lastName: 'User',
      role: UserRole.ADMIN,
      emailVerified: true,
      profile: {
        create: {
          bio: 'System Sub administrator',
        },
      },
      settings: {
        create: {},
      },
    },
  });
  console.log('Created Sub admin user:', subAdmin.email);

  // Create vendor user
  const vendorPassword = await bcrypt.hash('vendor123', salt);
  const vendorUser = await prisma.user.create({
    data: {
      email: 'vendor@example.com',
      password: vendorPassword,
      firstName: 'Vendor',
      lastName: 'User',
      role: UserRole.VENDOR,
      emailVerified: true,
      addresses: {
        create: [
          {
            street: '456 Vendor St',
            city: 'Los Angeles',
            state: 'CA',
            postalCode: '90001',
            country: 'USA',
            isDefault: true,
          },
        ],
      },
      settings: {
        create: {},
      },
      vendor: {
        create: {
          businessName: 'Quality Products Inc.',
          businessEmail: 'contact@qualityproducts.com',
          businessPhone: '+1234567890',
          description:
            'We sell the best quality products at affordable prices.',
          isVerified: true,
          slug: 'quality-products-inc.',
          status: ApplicationStatus.APPROVED,
          businessAddress: {
            create: {
              street: '123 Main St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'USA',
            },
          },
        },
      },
    },
  });
  console.log('Created vendor user:', vendorUser.email);

  // Create additional vendors for more realistic shipping scenarios
  const additionalVendors = await Promise.all([
    prisma.user.create({
      data: {
        email: 'vendor2@example.com',
        password: await bcrypt.hash('vendor123', await bcrypt.genSalt(10)),
        firstName: 'Tech',
        lastName: 'Gadgets',
        role: UserRole.VENDOR,
        emailVerified: true,
        addresses: {
          create: [
            {
              street: '789 Tech Blvd',
              city: 'San Francisco',
              state: 'CA',
              postalCode: '94102',
              country: 'USA',
              isDefault: true,
            },
          ],
        },
        settings: {
          create: {},
        },
        vendor: {
          create: {
            businessName: 'Tech Gadgets Co.',
            businessEmail: 'contact@techgadgets.com',
            businessPhone: '+1234567891',
            description: 'Latest tech gadgets and accessories.',
            isVerified: true,
            slug: 'tech-gadgets-co',
            status: ApplicationStatus.APPROVED,
            businessAddress: {
              create: {
                street: '789 Tech Blvd',
                city: 'San Francisco',
                state: 'CA',
                postalCode: '94102',
                country: 'USA',
              },
            },
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'vendor3@example.com',
        password: await bcrypt.hash('vendor123', await bcrypt.genSalt(10)),
        firstName: 'Fashion',
        lastName: 'Style',
        role: UserRole.VENDOR,
        emailVerified: true,
        addresses: {
          create: [
            {
              street: '321 Fashion Ave',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'USA',
              isDefault: true,
            },
          ],
        },
        settings: {
          create: {},
        },
        vendor: {
          create: {
            businessName: 'Fashion Style House',
            businessEmail: 'contact@fashionstyle.com',
            businessPhone: '+1234567892',
            description: 'Trendy fashion for all seasons.',
            isVerified: true,
            slug: 'fashion-style-house',
            status: ApplicationStatus.APPROVED,
            businessAddress: {
              create: {
                street: '321 Fashion Ave',
                city: 'New York',
                state: 'NY',
                postalCode: '10001',
                country: 'USA',
              },
            },
          },
        },
      },
    }),
  ]);

  // Create buyer user
  const buyerPassword = await bcrypt.hash('buyer123', salt);
  const buyer = await prisma.user.create({
    data: {
      email: 'buyer@example.com',
      password: buyerPassword,
      firstName: 'Buyer',
      lastName: 'User',
      role: UserRole.BUYER,
      emailVerified: true,
      addresses: {
        create: [
          {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'USA',
            isDefault: true,
          },
        ],
      },
      settings: {
        create: {},
      },
    },
    include: {
      addresses: true, // 👈 This tells Prisma to return addresses too
    },
  });
  console.log('Created buyer user:', buyer.email);

  // Create rider user
  const riderPassword = await bcrypt.hash('rider123', salt);
  const rider = await prisma.user.create({
    data: {
      email: 'rider@example.com',
      password: riderPassword,
      firstName: 'Rider',
      lastName: 'User',
      role: UserRole.RIDER,
      emailVerified: true,
      addresses: {
        create: [
          {
            street: '789 Delivery St',
            city: 'Chicago',
            state: 'IL',
            postalCode: '60601',
            country: 'USA',
            isDefault: true,
          },
        ],
      },
      settings: {
        create: {},
      },
      rider: {
        create: {
          vehicleType: VehicleType.MOTORCYCLE,
          vehiclePlate: 'ABC-123',
          licenseNumber: 'DL-456789',
          isVerified: true,
          isAvailable: true,
        },
      },
    },
    include: {
      rider: true,
    },
  });
  console.log('Created rider user:', rider.email);

  // Create additional shipping addresses for the buyer
  const additionalShippingAddresses = await prisma.shippingAddress.createMany({
    data: [
      {
        street: '456 Park Ave',
        city: 'New York',
        state: 'NY',
        postalCode: '10022',
        country: 'USA',
        isDefault: false,
        nickname: 'Work',
        addressType: 'WORK',
        userId: buyer.id,
      },
      {
        street: '789 Beach St',
        city: 'Miami',
        state: 'FL',
        postalCode: '33101',
        country: 'USA',
        isDefault: false,
        nickname: 'Vacation Home',
        addressType: 'OTHER',
        userId: buyer.id,
      },
    ],
  });

  console.log('Created additional shipping addresses for buyer');

  // Create shared shipping address
  const sharedAddressOwner = await prisma.user.create({
    data: {
      email: 'shared@example.com',
      password: await bcrypt.hash('shared123', await bcrypt.genSalt(10)),
      firstName: 'Shared',
      lastName: 'Address',
      role: UserRole.BUYER,
      emailVerified: true,
      addresses: {
        create: [
          {
            street: '101 Shared St',
            city: 'Boston',
            state: 'MA',
            postalCode: '02101',
            country: 'USA',
            isDefault: true,
          },
        ],
      },
      settings: {
        create: {},
      },
    },
  });

  const sharedShippingAddress = await prisma.shippingAddress.create({
    data: {
      street: '101 Shared St',
      city: 'Boston',
      state: 'MA',
      postalCode: '02101',
      country: 'USA',
      isDefault: true,
      nickname: 'Family Home',
      addressType: 'HOME',
      userId: sharedAddressOwner.id,
    },
  });

  // Share the address with the buyer
  await prisma.sharedAddress.create({
    data: {
      sharedById: sharedAddressOwner.id,
      sharedWithId: buyer.id,
      addressId: sharedShippingAddress.id,
      canEdit: false,
    },
  });

  console.log('Created shared shipping address');

  // Get the shipping addresses for the buyer
  const buyerShippingAddresses = await prisma.shippingAddress.findMany({
    where: {
      userId: buyer.id
    }
  });

  // Get the first shipping address for the buyer (should be the default one)
  const buyerShippingAddressId = buyerShippingAddresses[0]?.id;

  // If no shipping address found, create one
  let shippingAddressId = buyerShippingAddressId;
  if (!shippingAddressId) {
    const newShippingAddress = await prisma.shippingAddress.create({
      data: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        isDefault: true,
        userId: buyer.id,
      }
    });
    shippingAddressId = newShippingAddress.id;
  }

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Electronics & Gadgets Parent 1',
        description: 'Electronic devices and accessories',
        image: faker.image.avatar(),
        slug: 'electronics-&-gadgets-parent-1',
        userId: admin.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Clothing Parent 2',
        description: 'Apparel and fashion items',
        image: faker.image.avatar(),
        slug: 'clothing-parent-2',
        userId: admin.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Home & Kitchen Parent 3',
        slug: 'home-and-kitchen-parent-3',
        description: 'Home appliances and kitchen essentials',
        image: faker.image.avatar(),
        userId: admin.id,
      },
    }),
  ]);
  console.log('Created categories:', categories.map((c) => c.name).join(', '));

  // Create subcategories
  const electronicsSubcategories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Smartphones Child 1',
        description: 'Mobile phones and accessories',
        image: faker.image.avatar(),
        parentId: categories[0].id,
        slug: 'smartphones-child-1',
        userId: admin.id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Laptops Child 2',
        description: 'Notebooks and accessories',
        image: faker.image.avatar(),
        parentId: categories[0].id,
        slug: 'laptops-child-2',
        userId: admin.id,
      },
    }),
  ]);
  console.log(
    'Created subcategories:',
    electronicsSubcategories.map((c) => c.name).join(', '),
  );

  // Get vendor IDs
  const vendor = await prisma.vendor.findFirst({ where: { userId: vendorUser.id } });
  const vendorId = vendor.id;
  const vendor2Id = (await prisma.vendor.findFirst({ where: { userId: additionalVendors[0].id } })).id;
  const vendor3Id = (await prisma.vendor.findFirst({ where: { userId: additionalVendors[1].id } })).id;

  // Seed Products with Faker
  const products = await Promise.all(
    Array.from({ length: 6 }).map(() => {
      const name = faker.commerce.productName();
      const slug = faker.helpers.slugify(name.toLowerCase());
      const price = parseFloat(faker.commerce.price({ min: 200, max: 500 }));

      return prisma.product.create({
        data: {
          name,
          slug,
          description: faker.commerce.productDescription(),
          price,
          discountPrice: price - price * 0.2,
          quantity: faker.number.int({ min: 10, max: 100 }),
          sku: faker.string.alphanumeric(8).toUpperCase(),
          images: [faker.image.url(), faker.image.url()],
          isPublished: true,
          vendorId,
          category: {
            connect: [{ id: categories[0].id }], // many-to-many association
          },
          inventory: {
            create: {
              quantity: faker.number.int({ min: 10, max: 100 }),
              vendorId,
              lowStockThreshold: faker.number.int({ min: 3, max: 5 }),
            },
          },
        },
      });
    }),
  );

  // Seed Flash Sale Products with Faker
  const flashSaleProducts = await Promise.all(
    Array.from({ length: 6 }).map(() => {
      const name = faker.commerce.productName();
      const slug = faker.helpers.slugify(name.toLowerCase());
      const price = parseFloat(faker.commerce.price({ min: 200, max: 500 }));

      return prisma.product.create({
        data: {
          name,
          slug,
          description: faker.commerce.productDescription(),
          price,
          discountPrice: price - price * 0.2,
          quantity: faker.number.int({ min: 10, max: 100 }),
          sku: faker.string.alphanumeric(8).toUpperCase(),
          images: [faker.image.url(), faker.image.url()],
          isPublished: true,
          vendorId: vendor2Id, // Different vendor
          category: {
            connect: [{ id: categories[0].id }], // many-to-many association
          },
          inventory: {
            create: {
              quantity: faker.number.int({ min: 10, max: 100 }),
              vendorId: vendor2Id,
            },
          },
        },
      });
    }),
  );

  // Seed featured Products with Faker
  const featuredProducts = await Promise.all(
    Array.from({ length: 6 }).map(() => {
      const name = faker.commerce.productName();
      const slug = faker.helpers.slugify(name.toLowerCase());
      const price = parseFloat(faker.commerce.price({ min: 200, max: 500 }));

      return prisma.product.create({
        data: {
          name,
          slug,
          description: faker.commerce.productDescription(),
          price,
          discountPrice: price - price * 0.2,
          quantity: faker.number.int({ min: 10, max: 100 }),
          sku: faker.string.alphanumeric(8).toUpperCase(),
          images: [faker.image.url(), faker.image.url()],
          isPublished: true,
          vendorId: vendor3Id, // Different vendor
          warrantyInfo: faker.lorem.sentence(),
          returnPolicy: faker.lorem.sentence(),
          soldCount: faker.number.int({ min: 50, max: 100 }),
          viewCount: faker.number.int({ min: 20, max: 1000 }),
          category: {
            connect: [{ id: categories[0].id }], // many-to-many association
          },
          inventory: {
            create: {
              quantity: faker.number.int({ min: 10, max: 100 }),
              vendorId: vendor3Id,
            },
          },
        },
      });
    }),
  );

  console.log('Created products:', products.map((p) => p.name).join(', '));

  await Promise.all(
    featuredProducts.flatMap((product) => [
      // Product Colors
      prisma.productVariant.create({
        data: {
          size: 'Lg',
          color: '#FF0000',
          productId: product.id,
          price: 333,
          quantity: 10,
        },
      }),
      prisma.productVariant.create({
        data: {
          size: 'Md',
          color: '#AF0AB0',
          productId: product.id,
          price: 666,
          quantity: 15,
        },
      }),

      // Product Features
      prisma.productFeature.createMany({
        data: [
          {
            text: 'Water resistant up to 50 meters',
            productId: product.id,
          },
          {
            text: 'Battery lasts up to 7 days',
            productId: product.id,
          },
        ],
      }),

      // Product Specifications
      prisma.productSpecification.createMany({
        data: [
          {
            name: 'Weight',
            value: '1.2 kg',
            productId: product.id,
          },
          {
            name: 'Dimensions',
            value: '25 x 15 x 5 cm',
            productId: product.id,
          },
        ],
      }),

      // Product In-Box Items
      prisma.productInBox.createMany({
        data: [
          {
            item: 'Charging cable',
            productId: product.id,
          },
          {
            item: 'User manual',
            productId: product.id,
          },
        ],
      }),
    ]),
  );

  // Seed Shipping Policies
  const shippingPolicies = await Promise.all([
    prisma.shippingPolicy.create({
      data: {
        name: 'Standard Shipping Policy',
        description: 'Ships within 1-2 business days',
        processingTime: '1-2 business days',
        vendorId,
      },
    }),
    prisma.shippingPolicy.create({
      data: {
        name: 'Express Shipping Policy',
        description: 'Ships within 1 business day',
        processingTime: '1 business day',
        vendorId: vendor2Id,
      },
    }),
    prisma.shippingPolicy.create({
      data: {
        name: 'Economy Shipping Policy',
        description: 'Ships within 3-5 business days',
        processingTime: '3-5 business days',
        vendorId: vendor3Id,
      },
    }),
  ]);

  // Seed Shipping Options for a few Products (e.g., first 3)
  await Promise.all(
    featuredProducts.map(async (product) => {
      await prisma.shippingOption.createMany({
        data: [
          {
            name: 'Standard Delivery',
            price: 9.99,
            deliveryTime: '3-5 business days',
            productId: product.id,
          },
          {
            name: 'Express Delivery',
            price: 19.99,
            deliveryTime: '1-2 business days',
            productId: product.id,
          },
        ],
      });

      // Update the product with a shipping policy
      await prisma.product.update({
        where: { id: product.id },
        data: {
          shippingPolicyId: shippingPolicies[2].id, // Economy policy for featured products
        },
      });
    }),
  );

  // Seed Shipping Methods
  const shippingMethods = await Promise.all([
    prisma.shipping.create({
      data: {
        name: 'Standard Shipping',
        description: 'Delivers in 3-5 business days',
        deliveryTime: '3-5 business days',
        price: 5.99,
        minDays: 3,
        maxDays: 5,
        isActive: true,
        shippingType: 'STANDARD',
      },
    }),
    prisma.shipping.create({
      data: {
        name: 'Express Shipping',
        description: 'Delivers in 1-2 business days',
        deliveryTime: '1-2 business days',
        price: 12.99,
        minDays: 1,
        maxDays: 2,
        isActive: true,
        shippingType: 'EXPEDITED',
      },
    }),
    prisma.shipping.create({
      data: {
        name: 'Overnight Shipping',
        description: 'Delivers the next business day',
        deliveryTime: '1 business day',
        price: 24.99,
        minDays: 1,
        maxDays: 1,
        isActive: true,
        shippingType: 'ONE_DAY',
      },
    }),
    prisma.shipping.create({
      data: {
        name: 'International Shipping',
        description: 'Delivers in 7-14 business days',
        deliveryTime: '7-14 business days',
        price: 35.99,
        minDays: 7,
        maxDays: 14,
        isActive: true,
        shippingType: 'INTERNATIONAL',
      },
    }),
  ]);

  console.log('Created shipping methods');

  // Seed Shipping Zones with more detailed pricing
  const shippingZones = await Promise.all([
    // Standard Shipping Zones for Vendor 1 (Quality Products Inc.)
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'California',
        postalCode: '90001',
        price: 5.99,
        minPrice: 50, // Free shipping for orders over $50
        minWeight: 0,
        maxWeight: 5,
        shippingId: shippingMethods[0].id,
      },
    }),
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'New York',
        postalCode: '10001',
        price: 7.99,
        minWeight: 0,
        maxWeight: 5,
        shippingId: shippingMethods[0].id,
      },
    }),
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'Florida',
        postalCode: '33101',
        price: 8.99,
        minWeight: 0,
        maxWeight: 5,
        shippingId: shippingMethods[0].id,
      },
    }),
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'California',
        postalCode: '90001',
        price: 9.99,
        minWeight: 5,
        maxWeight: 10,
        shippingId: shippingMethods[0].id,
      },
    }),
    // Express Shipping Zones for Vendor 1
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'California',
        postalCode: '90001',
        price: 12.99,
        minPrice: 75, // Free shipping for orders over $75
        minWeight: 0,
        maxWeight: 5,
        shippingId: shippingMethods[1].id,
      },
    }),
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'New York',
        postalCode: '10001',
        price: 14.99,
        minWeight: 0,
        maxWeight: 5,
        shippingId: shippingMethods[1].id,
      },
    }),
    // Heavy items shipping for Vendor 1
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'California',
        postalCode: '90001',
        price: 25.99,
        minWeight: 10,
        maxWeight: 20,
        shippingId: shippingMethods[1].id,
      },
    }),
    // International Shipping Zones for Vendor 1
    prisma.shippingZone.create({
      data: {
        country: 'United Kingdom',
        region: 'England',
        price: 25.99,
        minWeight: 0,
        maxWeight: 5,
        shippingId: shippingMethods[3].id,
      },
    }),
    prisma.shippingZone.create({
      data: {
        country: 'Germany',
        region: 'Berlin',
        price: 29.99,
        minWeight: 0,
        maxWeight: 5,
        shippingId: shippingMethods[3].id,
      },
    }),
    // Standard Shipping Zones for Vendor 2 (Tech Gadgets Co.)
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'California',
        postalCode: '94102',
        price: 4.99,
        minPrice: 40, // Free shipping for orders over $40
        minWeight: 0,
        maxWeight: 3,
        shippingId: shippingMethods[0].id,
      },
    }),
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'New York',
        postalCode: '10001',
        price: 6.99,
        minWeight: 0,
        maxWeight: 3,
        shippingId: shippingMethods[0].id,
      },
    }),
    // Express Shipping Zones for Vendor 2
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'California',
        postalCode: '94102',
        price: 9.99,
        minPrice: 60, // Free shipping for orders over $60
        minWeight: 0,
        maxWeight: 3,
        shippingId: shippingMethods[1].id,
      },
    }),
    // International Shipping Zones for Vendor 2
    prisma.shippingZone.create({
      data: {
        country: 'United Kingdom',
        region: 'England',
        price: 20.99,
        minWeight: 0,
        maxWeight: 3,
        shippingId: shippingMethods[3].id,
      },
    }),
    // Standard Shipping Zones for Vendor 3 (Fashion Style House)
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'New York',
        postalCode: '10001',
        price: 3.99,
        minPrice: 30, // Free shipping for orders over $30
        minWeight: 0,
        maxWeight: 2,
        shippingId: shippingMethods[0].id,
      },
    }),
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'California',
        postalCode: '90001',
        price: 5.99,
        minWeight: 0,
        maxWeight: 2,
        shippingId: shippingMethods[0].id,
      },
    }),
    // Express Shipping Zones for Vendor 3
    prisma.shippingZone.create({
      data: {
        country: 'United States',
        region: 'New York',
        postalCode: '10001',
        price: 7.99,
        minPrice: 50, // Free shipping for orders over $50
        minWeight: 0,
        maxWeight: 2,
        shippingId: shippingMethods[1].id,
      },
    }),
  ]);

  console.log('Created shipping zones with detailed pricing');

  // Associate vendors with shipping methods with more varied pricing
  const vendorShippings = await Promise.all([
    // Main vendor (Quality Products Inc.) shipping associations
    prisma.vendorShipping.create({
      data: {
        vendorId,
        shippingId: shippingMethods[0].id,
        priceOverride: 4.99, // Vendor-specific price - cheaper than default
        isActive: true,
        fulfillment: 'MERCHANT',
      },
    }),
    prisma.vendorShipping.create({
      data: {
        vendorId,
        shippingId: shippingMethods[1].id,
        priceOverride: 9.99, // Vendor-specific price
        isActive: true,
        fulfillment: 'MERCHANT',
      },
    }),
    prisma.vendorShipping.create({
      data: {
        vendorId,
        shippingId: shippingMethods[2].id,
        priceOverride: 19.99, // Vendor-specific overnight shipping
        isActive: true,
        fulfillment: 'MERCHANT',
      },
    }),
    prisma.vendorShipping.create({
      data: {
        vendorId,
        shippingId: shippingMethods[3].id,
        priceOverride: 30.99, // Vendor-specific international shipping - cheaper than default
        isActive: true,
        fulfillment: 'MERCHANT',
      },
    }),
    // Second vendor (Tech Gadgets Co.) shipping associations
    prisma.vendorShipping.create({
      data: {
        vendorId: vendor2Id,
        shippingId: shippingMethods[0].id,
        priceOverride: 5.99, // Different pricing
        isActive: true,
        fulfillment: 'PLATFORM',
      },
    }),
    prisma.vendorShipping.create({
      data: {
        vendorId: vendor2Id,
        shippingId: shippingMethods[1].id,
        priceOverride: 11.99, // Different pricing
        isActive: true,
        fulfillment: 'PLATFORM',
      },
    }),
    prisma.vendorShipping.create({
      data: {
        vendorId: vendor2Id,
        shippingId: shippingMethods[3].id,
        priceOverride: 25.99, // Different international pricing
        isActive: true,
        fulfillment: 'PLATFORM',
      },
    }),
    // Third vendor (Fashion Style House) shipping associations - cheapest shipping
    prisma.vendorShipping.create({
      data: {
        vendorId: vendor3Id,
        shippingId: shippingMethods[0].id,
        priceOverride: 2.99, // Cheapest standard shipping
        isActive: true,
        fulfillment: 'PRIME',
      },
    }),
    prisma.vendorShipping.create({
      data: {
        vendorId: vendor3Id,
        shippingId: shippingMethods[1].id,
        priceOverride: 6.99, // Cheapest express shipping
        isActive: true,
        fulfillment: 'PRIME',
      },
    }),
    prisma.vendorShipping.create({
      data: {
        vendorId: vendor3Id,
        shippingId: shippingMethods[2].id,
        priceOverride: 15.99, // Cheapest overnight shipping
        isActive: true,
        fulfillment: 'PRIME',
      },
    }),
    prisma.vendorShipping.create({
      data: {
        vendorId: vendor3Id,
        shippingId: shippingMethods[3].id,
        priceOverride: 20.99, // Cheapest international shipping
        isActive: true,
        fulfillment: 'PRIME',
      },
    }),
  ]);

  console.log('Created vendor shipping associations with varied pricing');

  // Add Reviews
  const reviews = await Promise.all([
    prisma.review.create({
      data: {
        rating: faker.number.int({ min: 1, max: 5 }),
        comment: faker.lorem.sentences(2),
        productId: products[0].id,
        userId: buyer.id,
      },
    }),
    prisma.review.create({
      data: {
        rating: faker.number.int({ min: 1, max: 5 }),
        comment: faker.lorem.sentences(2),
        productId: products[0].id,
        userId: buyer.id,
      },
    }),
    prisma.review.create({
      data: {
        rating: faker.number.int({ min: 1, max: 5 }),
        comment: faker.lorem.sentences(2),
        productId: products[0].id,
        userId: buyer.id,
      },
    }),
    prisma.review.create({
      data: {
        rating: faker.number.int({ min: 1, max: 5 }),
        comment: faker.lorem.sentences(2),
        productId: products[0].id,
        userId: buyer.id,
      },
    }),
    prisma.review.create({
      data: {
        rating: faker.number.int({ min: 1, max: 5 }),
        comment: faker.lorem.sentences(2),
        productId: products[0].id,
        userId: buyer.id,
      },
    }),
    prisma.review.create({
      data: {
        rating: faker.number.int({ min: 1, max: 5 }),
        comment: faker.lorem.sentences(2),
        productId: products[0].id,
        userId: buyer.id,
      },
    }),
  ]);

  console.log('Created reviews for buyer:', reviews.length);

  // Create cart
  const cart = await prisma.cart.create({
    data: {
      userId: buyer.id,
    },
  });
  console.log('Created cart for buyer:', buyer.email);

  // Create wishlist
  const wishlist = await prisma.wishlistItem.create({
    data: {
      userId: buyer.id,
      productId: products[0].id,
    },
  });
  console.log('Created wishlist for buyer:', buyer.email);

  // Create order with shipping information for Vendor 1 (Quality Products Inc.)
  // Using standard shipping with vendor override price of $4.99
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20231027-001',
      userId: buyer.id,
      vendorId,
      tax: 27.99,
      shipping: 4.99, // Vendor-specific shipping price
      totalAmount: 313.95,
      subtotal: 281.96,
      total: 313.95,
      shippingCost: 4.99,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      addressId: buyer.addresses[0].id,
      shippingAddressId: shippingAddressId,
      items: {
        create: [
          {
            productId: products[0].id,
            quantity: 3,
            unitPrice: products[0].price,
            totalPrice: products[0].price * 3,
            shippingId: shippingMethods[0].id,
            shippingStatus: 'PROCESSING',
          },
          {
            productId: products[1].id,
            quantity: 2,
            unitPrice: products[1].price,
            totalPrice: products[1].price * 2,
            shippingId: shippingMethods[0].id,
            shippingStatus: 'PROCESSING',
          },
        ],
      },
    },
  });
  console.log('Created order for Vendor 1 (Quality Products Inc.):', order.orderNumber);

  // Create order shipping record for first order
  const orderShipping = await prisma.orderShipping.create({
    data: {
      orderId: order.id,
      shippingId: shippingMethods[0].id,
      trackingCode: 'TRACK-V1-1234567890',
      status: 'PROCESSING',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      vendorId: vendorId,
    },
  });
  console.log('Created order shipping record for Vendor 1:', orderShipping.id);

  // Create order with shipping information for Vendor 2 (Tech Gadgets Co.)
  // Using express shipping with vendor override price of $11.99
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20231027-002',
      userId: buyer.id,
      vendorId: vendor2Id,
      tax: 15.5,
      shipping: 11.99, // Vendor-specific shipping price
      totalAmount: 245.75,
      subtotal: 218.26,
      total: 245.75,
      shippingCost: 11.99,
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.COMPLETED,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      addressId: buyer.addresses[0].id,
      shippingAddressId: shippingAddressId,
      items: {
        create: [
          {
            productId: flashSaleProducts[0].id,
            quantity: 1,
            unitPrice: flashSaleProducts[0].price,
            totalPrice: flashSaleProducts[0].price,
            shippingId: shippingMethods[1].id,
            shippingStatus: 'PACKED',
          },
        ],
      },
    },
  });
  console.log('Created order for Vendor 2 (Tech Gadgets Co.):', order2.orderNumber);

  // Create order shipping record for second order
  const orderShipping2 = await prisma.orderShipping.create({
    data: {
      orderId: order2.id,
      shippingId: shippingMethods[1].id,
      trackingCode: 'TRACK-V2-0987654321',
      status: 'PACKED',
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      vendorId: vendor2Id,
    },
  });
  console.log('Created order shipping record for Vendor 2:', orderShipping2.id);

  // Create order with shipping information for Vendor 3 (Fashion Style House)
  // Using standard shipping with vendor override price of $2.99 (cheapest)
  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20231027-003',
      userId: buyer.id,
      vendorId: vendor3Id,
      tax: 8.25,
      shipping: 2.99, // Vendor-specific shipping price (cheapest)
      totalAmount: 125.24,
      subtotal: 114.00,
      total: 125.24,
      shippingCost: 2.99,
      status: OrderStatus.PROCESSING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      addressId: buyer.addresses[0].id,
      shippingAddressId: shippingAddressId,
      items: {
        create: [
          {
            productId: featuredProducts[0].id,
            quantity: 1,
            unitPrice: featuredProducts[0].price,
            totalPrice: featuredProducts[0].price,
            shippingId: shippingMethods[0].id,
            shippingStatus: 'PROCESSING',
          },
          {
            productId: featuredProducts[1].id,
            quantity: 2,
            unitPrice: featuredProducts[1].price,
            totalPrice: featuredProducts[1].price * 2,
            shippingId: shippingMethods[0].id,
            shippingStatus: 'PROCESSING',
          },
        ],
      },
    },
  });
  console.log('Created order for Vendor 3 (Fashion Style House):', order3.orderNumber);

  // Create order shipping record for third order
  const orderShipping3 = await prisma.orderShipping.create({
    data: {
      orderId: order3.id,
      shippingId: shippingMethods[0].id,
      trackingCode: 'TRACK-V3-1122334455',
      status: 'PROCESSING',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      vendorId: vendor3Id,
    },
  });
  console.log('Created order shipping record for Vendor 3:', orderShipping3.id);

  // Create international order for Vendor 1 with international shipping
  // Using international shipping with vendor override price of $30.99
  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20231027-004',
      userId: buyer.id,
      vendorId: vendorId,
      tax: 42.75,
      shipping: 30.99, // Vendor-specific international shipping price
      totalAmount: 425.74,
      subtotal: 352.00,
      total: 425.74,
      shippingCost: 30.99,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      addressId: buyer.addresses[0].id,
      shippingAddressId: shippingAddressId,
      items: {
        create: [
          {
            productId: products[2].id,
            quantity: 1,
            unitPrice: products[2].price,
            totalPrice: products[2].price,
            shippingId: shippingMethods[3].id,
            shippingStatus: 'PROCESSING',
          },
          {
            productId: products[3].id,
            quantity: 1,
            unitPrice: products[3].price,
            totalPrice: products[3].price,
            shippingId: shippingMethods[3].id,
            shippingStatus: 'PROCESSING',
          },
        ],
      },
    },
  });
  console.log('Created international order for Vendor 1:', order4.orderNumber);

  // Create order shipping record for international order
  const orderShipping4 = await prisma.orderShipping.create({
    data: {
      orderId: order4.id,
      shippingId: shippingMethods[3].id,
      trackingCode: 'TRACK-V1-INT-5566778899',
      status: 'PROCESSING',
      estimatedDelivery: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
      vendorId: vendorId,
    },
  });
  console.log('Created international order shipping record for Vendor 1:', orderShipping4.id);

  // Create delivery for first order
  const delivery = await prisma.delivery.create({
    data: {
      orderId: order.id,
      riderId: rider.rider.id,
      status: DeliveryStatus.PENDING,
      trackingNumber: 'TRACK-V1-1234567890',
      pickupAddress: 'TechStore Warehouse, 456 Tech Ave, New York, NY 10002',
      deliveryAddress: '123 Main St, Apt 4B, New York, NY 10001',
    },
  });
  console.log('Created delivery for order 1:', delivery.id);

  // Create delivery for second order
  const delivery2 = await prisma.delivery.create({
    data: {
      orderId: order2.id,
      riderId: rider.rider.id,
      status: DeliveryStatus.PENDING,
      trackingNumber: 'TRACK-V2-0987654321',
      pickupAddress: 'Tech Gadgets Warehouse, 789 Tech Blvd, San Francisco, CA 94102',
      deliveryAddress: '123 Main St, Apt 4B, New York, NY 10001',
    },
  });
  console.log('Created delivery for order 2:', delivery2.id);

  // Create delivery for third order
  const delivery3 = await prisma.delivery.create({
    data: {
      orderId: order3.id,
      riderId: rider.rider.id,
      status: DeliveryStatus.PENDING,
      trackingNumber: 'TRACK-V3-1122334455',
      pickupAddress: 'Fashion Style House, 321 Fashion Ave, New York, NY 10001',
      deliveryAddress: '123 Main St, Apt 4B, New York, NY 10001',
    },
  });
  console.log('Created delivery for order 3:', delivery3.id);

  // Create delivery for international order
  const delivery4 = await prisma.delivery.create({
    data: {
      orderId: order4.id,
      riderId: rider.rider.id,
      status: DeliveryStatus.PENDING,
      trackingNumber: 'TRACK-V1-INT-5566778899',
      pickupAddress: 'TechStore Warehouse, 456 Tech Ave, New York, NY 10002',
      deliveryAddress: '123 Main St, Apt 4B, New York, NY 10001',
    },
  });
  console.log('Created delivery for international order:', delivery4.id);

  // Create payment
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      userId: buyer.id,
      amount: order.totalAmount,
      method: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.PENDING,
      transactionReference: 'TRANS-9876543210',
      paymentType: PaymentType.ORDER,
    },
  });
  console.log('Created payment:', payment.id);

  // Create notification
  const notification = await prisma.notification.create({
    data: {
      userId: buyer.id,
      title: 'Order Placed',
      message: `Your order ${order.orderNumber} has been placed successfully.`,
      type: NotificationType.ORDER_STATUS,
    },
  });
  console.log('Created notification:', notification.title);

  // Create flash sale
  const flashSale = await prisma.flashSale.create({
    data: {
      name: 'Summer Sale',
      description: 'Biggest discounts of the summer',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true,
      vendorId,
      slug: 'summer-sale',
    },
  });
  console.log('Created flash sale:', flashSale.name);

  // Create coupon
  const coupon = await prisma.coupon.create({
    data: {
      code: 'SUMMER20',
      description: '20% off on all products',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minPurchase: 100,
      maxDiscount: 200,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isActive: true,
      vendorId,
    },
  });
  console.log('Created coupon:', coupon.code);

  // Seed Flash Sale Items for Products
  const flashSaleItems = await Promise.all(
    flashSaleProducts.map((product) =>
      prisma.flashSaleItem.create({
        data: {
          flashSaleId: flashSale.id,
          productId: product.id,
          discountPercentage: faker.number.int({ min: 10, max: 70 }),
          quantity: faker.number.int({ min: 15, max: 50 }),
        },
      }),
    ),
  );

  console.log('Created flashSaleItems:', flashSaleItems.length);

  // Seed Advertisement
  // Create Advertisements
  const ad1 = await prisma.advertisement.create({
    data: {
      title: 'Amazing Featured Product',
      description: 'This is a fantastic banner ad!',
      type: AdType.FEATURED_PRODUCT,
      vendorId,
      status: AdStatus.ACTIVE,
      bidAmount: 100,
      pricingModel: PricingModel.CPC,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
      budget: 500,
      imageUrl: 'https://example.com/banner.png',
    },
  });

  // Create Advertisements for featured vendor
  const ad2 = await prisma.advertisement.create({
    data: {
      title: 'Amazing Featured Vendor',
      description: 'This is a fantastic vendor ad!',
      type: AdType.FEATURED_VENDOR,
      vendorId,
      status: AdStatus.ACTIVE,
      bidAmount: 100,
      pricingModel: PricingModel.CPC,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
      budget: 500,
      imageUrl: 'https://example.com/banner.png',
    },
  });

  // Seed Featured Products. Items for Products
  const productAdvertisement = await Promise.all(
    featuredProducts.map((product) =>
      prisma.productAdvertisement.create({
        data: {
          advertisementId: ad1.id,
          productId: product.id,
          displayOrder: faker.number.int({ min: 1, max: 100 }),
          customTitle: faker.commerce.productName(),
          customDescription: faker.commerce.productDescription(),
          customImageUrl: faker.image.url(),
          customPrice: parseFloat(faker.commerce.price({ min: 200, max: 500 })),
        },
      }),
    ),
  );

  console.log('Created featuredProduct advert:', productAdvertisement.length);

  // Create Ad Targeting
  await prisma.adTargeting.create({
    data: {
      advertisementId: ad1.id,
      minAge: 18,
      maxAge: 35,
      genders: ['MALE', 'FEMALE'],
      locations: ['United States', 'Canada'],
      interests: ['Technology', 'Travel'],
      languages: ['English'],
      devices: ['Mobile', 'Desktop'],
    },
  });

  // Create Platform Reference
  await prisma.adPlatformReference.create({
    data: {
      advertisementId: ad1.id,
      platform: AdPlatform.IN_APP,
      externalId: `fb_${ad1.id}`,
      status: 'ACTIVE',
      metadata: {
        pageId: '123456789',
        campaignId: '987654321',
      },
    },
  });

  // Create Ad Payment
  await prisma.adPayment.create({
    data: {
      advertisementId: ad1.id,
      amount: 100,
      currency: 'USD',
      paymentMethod: 'CREDIT_CARD',
      status: 'COMPLETED',
      transactionReference: 'txn_001',
      processedAt: new Date(),
    },
  });

  // Create Analytics
  await prisma.adAnalytics.create({
    data: {
      advertisementId: ad1.id,
      date: new Date(),
      views: 5000,
      platform: AdPlatform.IN_APP,
      clicks: 300,
      conversions: 50,
      conversionValue: 1500,
      ctr: 0.06,
      conversionRate: 0.01,
    },
  });

  // Create User Interaction
  await prisma.adUserInteraction.create({
    data: {
      advertisementId: ad1.id,
      interactionType: 'CLICK',
      timestamp: new Date(),
      conversionValue: 30,
      ipAddress: '192.168.1.1',
      referrer: 'https://google.com',
      deviceInfo: {
        os: 'iOS',
        browser: 'Safari',
      },
      metadata: {
        sessionDuration: '5m',
      },
    },
  });

  // Create Ad Platform Config (for settings)
  await prisma.adPlatformConfig.create({
    data: {
      platform: AdPlatform.IN_APP,
      advertisementId: ad1.id,
      name: 'Facebook Ads Config',
      description: 'Configuration for Facebook Ads',

      config: {
        apiKey: 'fb_api_key_123',
        secret: 'fb_secret_abc',
      },
    },
  });

  await prisma.supportTicket.create({
    data: {
      userId: buyer.id,
      subject: 'Issue with recent order',
      description: 'The product arrived damaged.',
      status: 'OPEN',
    },
  });

  // Seed Recently Viewed Products
  const recentlyViewed = await Promise.all(
    products.slice(0, 3).map((product) =>
      prisma.recentlyViewedProduct.create({
        data: {
          userId: buyer.id,
          productId: product.id,
          viewedAt: new Date(
            Date.now() - Math.floor(Math.random() * 100000000),
          ), // Random recent timestamp
        },
      }),
    ),
  );
  console.log(
    'Created recently viewed products:',
    recentlyViewed.map((rv) => rv.productId),
  );

  // Seed Recently Viewed Products for a Guest
  const sessionId = 'sessionId-12345'; // simulate guest session ID

  const guestViewed = await Promise.all(
    products.slice(3, 6).map((product) =>
      prisma.recentlyViewedProduct.create({
        data: {
          sessionId,
          productId: product.id,
          viewedAt: new Date(
            Date.now() - Math.floor(Math.random() * 100000000),
          ),
        },
      }),
    ),
  );

  console.log(
    'Created recently viewed products for guest:',
    guestViewed.map((rv) => rv.productId),
  );

  // Create FAQ
  const faqs = await Promise.all([
    prisma.faq.create({
      data: {
        question: 'How do I place an order?',
        answer:
          'You can place an order by adding products to your cart and proceeding to checkout.',
        category: 'Orders',
        isPublished: true,
        order: 1,
      },
    }),
    prisma.faq.create({
      data: {
        question: 'What payment methods do you accept?',
        answer: 'We accept credit/debit cards, PayPal, and bank transfers.',
        category: 'Payments',
        isPublished: true,
        order: 2,
      },
    }),
  ]);
  console.log('Created FAQs:', faqs.length);

  // Create support users
  const supportUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'support@example.com',
        password: await bcrypt.hash('support123', await bcrypt.genSalt(10)),
        firstName: 'Customer',
        lastName: 'Support',
        role: UserRole.ADMIN,
        emailVerified: true,
        profile: {
          create: {
            bio: 'Customer Support Representative',
          },
        },
        settings: {
          create: {},
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'billing@example.com',
        password: await bcrypt.hash('billing123', await bcrypt.genSalt(10)),
        firstName: 'Billing',
        lastName: 'Department',
        role: UserRole.ADMIN,
        emailVerified: true,
        profile: {
          create: {
            bio: 'Billing Department Representative',
          },
        },
        settings: {
          create: {},
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'shipping@example.com',
        password: await bcrypt.hash('shipping123', await bcrypt.genSalt(10)),
        firstName: 'Shipping',
        lastName: 'Support',
        role: UserRole.ADMIN,
        emailVerified: true,
        profile: {
          create: {
            bio: 'Shipping Support Representative',
          },
        },
        settings: {
          create: {},
        },
      },
    }),
  ]);
  console.log('Created support users');

  // Create conversations and messages
  const conversations = await Promise.all([
    // Conversation with Customer Support
    prisma.conversation.create({
      data: {
        participants: [buyer.id, supportUsers[0].id],
        lastMessage: 'Thank you for contacting us. How can we help you today?',
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        messages: {
          create: [
            {
              senderId: buyer.id,
              content: 'Hi, I have an issue with my recent order. The product seems to be damaged.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
            },
            {
              senderId: supportUsers[0].id,
              content: 'I\'m sorry to hear about the damaged product. Can you please provide your order number?',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
            },
            {
              senderId: buyer.id,
              content: `My order number is ${order.orderNumber}. The package arrived yesterday but the item was cracked.`,
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 2.2 * 60 * 60 * 1000), // 2.2 hours ago
            },
            {
              senderId: supportUsers[0].id,
              content: 'Thank you for providing the order details. I\'ve initiated a replacement process for you. You should receive a new item within 3-5 business days.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            },
          ],
        },
      },
    }),
    // Conversation with Vendor
    prisma.conversation.create({
      data: {
        participants: [buyer.id, vendorUser.id],
        lastMessage: 'The product will be restocked next week. I\'ll notify you when it\'s available.',
        lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        messages: {
          create: [
            {
              senderId: buyer.id,
              content: 'Hello! I\'m interested in purchasing your smartphone but it shows out of stock. When will it be available?',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
            },
            {
              senderId: vendorUser.id,
              content: 'Hi! Thank you for your interest. We\'re expecting a new shipment early next week.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 24.5 * 60 * 60 * 1000), // 24.5 hours ago
            },
            {
              senderId: buyer.id,
              content: 'That\'s great! Can you let me know the exact date? I need it for a business trip.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 24.2 * 60 * 60 * 1000), // 24.2 hours ago
            },
            {
              senderId: vendorUser.id,
              content: 'The product will be restocked next week. I\'ll notify you when it\'s available.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            },
          ],
        },
      },
    }),
    // Conversation with Billing Department
    prisma.conversation.create({
      data: {
        participants: [buyer.id, supportUsers[1].id],
        lastMessage: 'Your refund has been processed and should appear in your account within 3-5 business days.',
        lastMessageAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        messages: {
          create: [
            {
              senderId: buyer.id,
              content: 'Hi, I was charged twice for the same order. Can you help me with this?',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
            },
            {
              senderId: supportUsers[1].id,
              content: 'I can help you with that. Can you please provide the transaction details?',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 7.5 * 60 * 60 * 1000), // 7.5 hours ago
            },
            {
              senderId: buyer.id,
              content: 'The transaction reference is TRANS-9876543210. I see two charges of $313.95 each.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
            },
            {
              senderId: supportUsers[1].id,
              content: 'I\'ve reviewed your account and confirmed the duplicate charge. I\'ve initiated a refund for the extra amount.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 6.5 * 60 * 60 * 1000), // 6.5 hours ago
            },
            {
              senderId: supportUsers[1].id,
              content: 'Your refund has been processed and should appear in your account within 3-5 business days.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
            },
          ],
        },
      },
    }),
    // Conversation with Shipping Support
    prisma.conversation.create({
      data: {
        participants: [buyer.id, supportUsers[2].id],
        lastMessage: 'Your package is currently in transit and should arrive tomorrow by 5 PM.',
        lastMessageAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        messages: {
          create: [
            {
              senderId: buyer.id,
              content: 'Hello, I haven\'t received any updates on my shipment. The tracking shows it\'s been in transit for 3 days.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            },
            {
              senderId: supportUsers[2].id,
              content: 'Let me check the status of your shipment. Can you provide the tracking number?',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
            },
            {
              senderId: buyer.id,
              content: 'The tracking number is TRACK-V1-1234567890',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 1.2 * 60 * 60 * 1000), // 1.2 hours ago
            },
            {
              senderId: supportUsers[2].id,
              content: 'I\'ve checked with our logistics partner. There was a slight delay due to weather conditions, but your package is now moving.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
            },
            {
              senderId: supportUsers[2].id,
              content: 'Your package is currently in transit and should arrive tomorrow by 5 PM.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            },
          ],
        },
      },
    }),
    // Conversation with another vendor (Tech Gadgets)
    prisma.conversation.create({
      data: {
        participants: [buyer.id, additionalVendors[0].id],
        lastMessage: 'Perfect! I\'ll prepare a custom bundle for you with a 15% discount.',
        lastMessageAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        messages: {
          create: [
            {
              senderId: buyer.id,
              content: 'Hi! I\'m interested in buying multiple tech accessories. Do you offer bulk discounts?',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
            },
            {
              senderId: additionalVendors[0].id,
              content: 'Hello! Yes, we do offer bulk discounts. What items are you looking to purchase?',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000), // 4.5 hours ago
            },
            {
              senderId: buyer.id,
              content: 'I need 5 wireless chargers, 3 phone cases, and 2 bluetooth speakers for my office.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 4.2 * 60 * 60 * 1000), // 4.2 hours ago
            },
            {
              senderId: additionalVendors[0].id,
              content: 'Perfect! I\'ll prepare a custom bundle for you with a 15% discount.',
              messageType: 'TEXT',
              createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
            },
          ],
        },
      },
    }),
  ]);
  console.log('Created conversations and messages');

  console.log('Database seeded successfully!');
  console.log('Seed completed \ud83c\udf31');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });