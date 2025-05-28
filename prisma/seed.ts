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

import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  // Clean database
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.rider.deleteMany();
  await prisma.product.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.flashSaleItem.deleteMany();
  await prisma.flashSale.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productAdvertisement.deleteMany();
  await prisma.advertisement.deleteMany();
  await prisma.adTargeting.deleteMany();
  await prisma.adPlatformReference.deleteMany();
  await prisma.adPayment.deleteMany();
  await prisma.adAnalytics.deleteMany();
  await prisma.adUserInteraction.deleteMany();
  await prisma.adPlatformConfig.deleteMany();

  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
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
  const subAdminPassword = await bcrypt.hash('subAdmin123', 10);
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
  const vendorPassword = await bcrypt.hash('vendor123', 10);
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

  // Create buyer user
  const buyerPassword = await bcrypt.hash('buyer123', 10);
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
  const riderPassword = await bcrypt.hash('rider123', 10);
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

  // Get vendor ID
  const vendorId = (
    await prisma.vendor.findFirst({ where: { userId: vendorUser.id } })
  ).id;

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
          categoryId: categories[0].id,
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
          vendorId,
          categoryId: categories[0].id,
          inventory: {
            create: {
              quantity: faker.number.int({ min: 10, max: 100 }),
              vendorId,
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
          vendorId,
          categoryId: categories[0].id,
          inventory: {
            create: {
              quantity: faker.number.int({ min: 10, max: 100 }),
              vendorId,
            },
          },
        },
      });
    }),
  );

  console.log('Created products:', products.map((p) => p.name).join(', '));

  // Add Review .
  const reviews = await prisma.review.create({
    data: {
      rating: faker.number.int({ min: 1, max: 5 }),
      comment: faker.lorem.sentences(2),
      productId: products[0].id,
      userId: buyer.id,
    },
  });

  console.log('Created reviews for buyer:', reviews);

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

  // Create order
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20231027-001',
      userId: buyer.id,
      vendorId,
      tax: 27.99,
      shipping: 5.99,
      totalAmount: 313.95,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      addressId: buyer.addresses[0].id,
      items: {
        create: [
          {
            productId: products[0].id,
            quantity: 3,
            unitPrice: products[0].price,
            totalPrice: products[0].price * 3,
          },
          {
            productId: products[1].id,
            quantity: 2,
            unitPrice: products[1].price,
            totalPrice: products[1].price * 2,
          },
        ],
      },
    },
  });
  console.log('Created order:', order.orderNumber);

  // Create delivery
  const delivery = await prisma.delivery.create({
    data: {
      orderId: order.id,
      riderId: rider.rider.id,
      status: DeliveryStatus.PENDING,
      trackingNumber: 'TRACK-1234567890',
      pickupAddress: 'TechStore Warehouse, 456 Tech Ave, New York, NY 10002',
      deliveryAddress: '123 Main St, Apt 4B, New York, NY 10001',
    },
  });
  console.log('Created delivery:', delivery.id);

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

  console.log('Created flashSaleItems:', flashSaleItems);

  // Seed Advertisement
  // Create Advertisements
  const ad1 = await prisma.advertisement.create({
    data: {
      title: 'Amazing Faetured Product',
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
      title: 'Amazing Faetured Vendor',
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

  console.log('Created featuredProduct advert:', productAdvertisement);

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
