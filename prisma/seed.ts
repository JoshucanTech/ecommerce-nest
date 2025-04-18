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
} from "@prisma/client"
import * as bcrypt from "bcrypt"
import { generateSlug } from "src/utils/slug-generator"


const prisma = new PrismaClient()

async function main() {
  // Clean database
  await prisma.user.deleteMany()
  await prisma.category.deleteMany()
  await prisma.vendor.deleteMany()
  await prisma.rider.deleteMany()
  await prisma.product.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.wishlistItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.delivery.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.flashSale.deleteMany()
  await prisma.coupon.deleteMany()
  await prisma.supportTicket.deleteMany()
  await prisma.faq.deleteMany()

  console.log("Seeding database...")

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: adminPassword,
      firstName: "Admin",
      lastName: "User",
      role: UserRole.ADMIN,
      emailVerified: true,
      profile: {
        create: {
          bio: "System administrator",
        },
      },
      settings: {
        create: {},
      },
    },
  })
  console.log("Created admin user:", admin.email)

   // Create sub-admin user
   const subAdminPassword = await bcrypt.hash("subAdmin123", 10)
   const subAdmin = await prisma.user.create({
     data: {
       email: "subAdmin@example.com",
       password: subAdminPassword,
       firstName: "SubAdmin",
       lastName: "User",
       role: UserRole.ADMIN,
       emailVerified: true,
       profile: {
         create: {
           bio: "System Sub administrator",
         },
       },
       settings: {
         create: {},
       },
     },
   })
   console.log("Created Sub admin user:", subAdmin.email)

  // Create vendor user
  const vendorPassword = await bcrypt.hash("vendor123", 10)
  const vendorUser = await prisma.user.create({
    data: {
      email: "vendor@example.com",
      password: vendorPassword,
      firstName: "Vendor",
      lastName: "User",
      role: UserRole.VENDOR,
      emailVerified: true,
      addresses: {
        create: [
          {
            street: "456 Vendor St",
            city: "Los Angeles",
            state: "CA",
            postalCode: "90001",
            country: "USA",
            isDefault: true,
          },
        ],
      },
      settings: {
        create: {},
      },
      vendor: {
        create: {
          businessName: "Quality Products Inc.",
          businessEmail: "contact@qualityproducts.com",
          businessPhone: "+1234567890",
          businessAddress: "123 Business St, New York, NY 10001",
          description: "We sell the best quality products at affordable prices.",
          isVerified: true,
          slug:"quality-products-inc."
        },
      },
    },
  })
  console.log("Created vendor user:", vendorUser.email)

  // Create buyer user
  const buyerPassword = await bcrypt.hash("buyer123", 10)
  const buyer = await prisma.user.create({
    data: {
      email: "buyer@example.com",
      password: buyerPassword,
      firstName: "Buyer",
      lastName: "User",
      role: UserRole.BUYER,
      emailVerified: true,
      addresses: {
        create: [
          {
            street: "123 Main St",
            city: "New York",
            state: "NY",
            postalCode: "10001",
            country: "USA",
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
  })
  console.log("Created buyer user:", buyer.email)

  // Create rider user
  const riderPassword = await bcrypt.hash("rider123", 10)
  const rider = await prisma.user.create({
    data: {
      email: "rider@example.com",
      password: riderPassword,
      firstName: "Rider",
      lastName: "User",
      role: UserRole.RIDER,
      emailVerified: true,
      addresses: {
        create: [
          {
            street: "789 Delivery St",
            city: "Chicago",
            state: "IL",
            postalCode: "60601",
            country: "USA",
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
          vehiclePlate: "ABC-123",
          licenseNumber: "DL-456789",
          isVerified: true,
          isAvailable: true,
        },
      },
    },
    include: {
      rider: true,
    }
  })
  console.log("Created rider user:", rider.email)

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Electronics & Gadgets Parent 1",
        description: "Electronic devices and accessories",
        image: "/placeholder.svg?height=100&width=100",
        slug:"electronics-&-gadgets-parent-1",
        userId:admin.id
      },
    }),
    prisma.category.create({
      data: {
        name: "Clothing Parent 2",
        description: "Apparel and fashion items",
        image: "/placeholder.svg?height=100&width=100",
        slug:"clothing-parent-2",
        userId:admin.id
      },
    }),
    prisma.category.create({
      data: {
        name: "Home & Kitchen Parent 3",
        slug: "home-and-kitchen-parent-3",
        description: "Home appliances and kitchen essentials",
        image: "/placeholder.svg?height=100&width=100",
        userId:admin.id
      },
    }),
  ])
  console.log("Created categories:", categories.map((c) => c.name).join(", "))

  // Create subcategories
  const electronicsSubcategories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Smartphones Child 1",
        description: "Mobile phones and accessories",
        image: "https://example.com/smartphones.jpg",
        parentId: categories[0].id,
        slug:"smartphones-child-1",
        userId:admin.id,

      },
    }),
    prisma.category.create({
      data: {
        name: "Laptops Child 2",
        description: "Notebooks and accessories",
        image: "https://example.com/laptops.jpg",
        parentId: categories[0].id,
        slug:"laptops-child-2",
        userId:admin.id,
      },
    }),
  ])
  console.log("Created subcategories:", electronicsSubcategories.map((c) => c.name).join(", "))

  // Create products
  const vendorId = (await prisma.vendor.findFirst({ where: { userId: vendorUser.id } })).id

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Smartphone X",
        slug: "smartphone-x",
        description: "Latest smartphone with amazing features",
        price: 999.99,
        discountPrice: 899.99,
        quantity: 100,
        sku: "PHONE-X-001",
        images: ["/placeholder.svg?height=300&width=300","https://example.com/phone-x-1.jpg", "https://example.com/phone-x-2.jpg"],
        isPublished: true,
        vendorId,
        categoryId: categories[0].id,
        inventory: {
          create: {
            quantity: 100,
            vendorId,
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        name: "Cotton T-Shirt",
        slug: "cotton-t-shirt",
        description: "Comfortable cotton t-shirt for everyday wear",
        price: 1529.99,
        discountPrice: 1399.99,
        quantity: 100,
        sku: "TS-001",
        images: ["/placeholder.svg?height=300&width=300"],
        isPublished: true,
        vendorId,
        categoryId: categories[1].id,
        inventory: {
          create: {
            quantity: 100,
            vendorId,
          },
        },
      },
    }),
    prisma.product.create({
      data: {
        name: "Stainless Steel Cookware Set",
        slug: "stainless-steel-cookware-set",
        description: "Durable cookware set for all your cooking needs",
        price: 149.99,
        quantity: 30,
        sku: "CK-001",
        images: ["/placeholder.svg?height=300&width=300"],
        isPublished: true,
        vendorId,
        categoryId: categories[2].id,
        inventory: {
          create: {
            quantity: 30,
            vendorId,
          },
        },
      },
    }),
  ])
  console.log("Created products:", products.map((p) => p.name).join(", "))

  // Create cart
  const cart = await prisma.cart.create({
    data: {
      userId: buyer.id,
    },
  })
  console.log("Created cart for buyer:", buyer.email)

  // Create wishlist
  const wishlist = await prisma.wishlistItem.create({
    data: {
      userId: buyer.id,
      productId: products[0].id,
    },
  })
  console.log("Created wishlist for buyer:", buyer.email)

  // Create order
  const order = await prisma.order.create({
    data: {
      orderNumber: "ORD-20231027-001",
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
            quantity: 1,
            unitPrice: products[0].price,
            totalPrice: products[0].price,
          },
          {
            productId: products[1].id,
            quantity: 1,
            unitPrice: products[1].price,
            totalPrice: products[1].price,
          },
        ],
      },
    },
  })
  console.log("Created order:", order.orderNumber)

  // Create delivery
  const delivery = await prisma.delivery.create({
    data: {
      orderId: order.id,
      riderId: rider.rider.id,
      status: DeliveryStatus.PENDING,
      trackingNumber: "TRACK-1234567890",
      pickupAddress: "TechStore Warehouse, 456 Tech Ave, New York, NY 10002",
      deliveryAddress: "123 Main St, Apt 4B, New York, NY 10001",
    },
  })
  console.log("Created delivery:", delivery.id)

  // Create payment
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      userId: buyer.id,
      amount: order.totalAmount,
      method: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.PENDING,
      transactionReference: "TRANS-9876543210",
      paymentType: PaymentType.ORDER,
      
    },
  })
  console.log("Created payment:", payment.id)

  // Create notification
  const notification = await prisma.notification.create({
    data: {
      userId: buyer.id,
      title: "Order Placed",
      message: `Your order ${order.orderNumber} has been placed successfully.`,
      type: NotificationType.ORDER_STATUS,
    },
  })
  console.log("Created notification:", notification.title)

  // Create flash sale
  const flashSale = await prisma.flashSale.create({
    data: {
      name: "Summer Sale",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true,
      vendorId,
      slug: "summer-sale",
    },
  })
  console.log("Created flash sale:", flashSale.name)

  // Create coupon
  const coupon = await prisma.coupon.create({
    data: {
      code: "SUMMER20",
      description: "20% off on all products",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minPurchase: 100,
      maxDiscount: 200,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isActive: true,
      vendorId,
    },
  })
  console.log("Created coupon:", coupon.code)

  // Create FAQ
  const faqs = await Promise.all([
    prisma.faq.create({
      data: {
        question: "How do I place an order?",
        answer: "You can place an order by adding products to your cart and proceeding to checkout.",
        category: "Orders",
        isPublished: true,
        order: 1,
      },
    }),
    prisma.faq.create({
      data: {
        question: "What payment methods do you accept?",
        answer: "We accept credit/debit cards, PayPal, and bank transfers.",
        category: "Payments",
        isPublished: true,
        order: 2,
      },
    }),
  ])
  console.log("Created FAQs:", faqs.length)

  console.log("Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
