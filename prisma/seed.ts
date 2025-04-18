import { PrismaClient, UserRole } from "@prisma/client"
import * as bcrypt from "bcrypt"
import { generateSlug } from "src/utils/slug-generator"

const prisma = new PrismaClient()

async function main() {
  // Clean database
  await prisma.user.deleteMany()
  await prisma.category.deleteMany()

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
      profile: {
        create: {
          bio: "I sell quality products",
        },
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
          slug:""
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
      profile: {
        create: {
          bio: "I love shopping",
        },
      },
      settings: {
        create: {},
      },
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
      profile: {
        create: {
          bio: "I deliver fast",
        },
      },
      settings: {
        create: {},
      },
      rider: {
        create: {
          vehicleType: "MOTORCYCLE",
          vehiclePlate: "ABC123",
          licenseNumber: "DL12345",
          isVerified: true,
          isAvailable: true,
        },
      },
    },
  })
  console.log("Created rider user:", rider.email)

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Electronics & Gadgets Parent 1",
        description: "Electronic devices and accessories",
        image: "https://example.com/electronics.jpg",
        slug:"",
        userId:admin.id

      },
    }),
    prisma.category.create({
      data: {
        name: "Clothing Parent 2",
        description: "Apparel and fashion items",
        image: "https://example.com/clothing.jpg",
        slug:"",
        userId:admin.id
      },
    }),
    prisma.category.create({
      data: {
        name: "Home & Kitchen Parent 3",
        description: "Home appliances and kitchen essentials",
        image: "https://example.com/home.jpg",
        slug:"",
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
        slug:"",
        userId:admin.id,

      },
    }),
    prisma.category.create({
      data: {
        name: "Laptops Child 2",
        description: "Notebooks and accessories",
        image: "https://example.com/laptops.jpg",
        parentId: categories[0].id,
        slug:"",
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
        description: "Latest smartphone with amazing features",
        price: 999.99,
        discountPrice: 899.99,
        quantity: 100,
        sku: "PHONE-X-001",
        images: ["https://example.com/phone-x-1.jpg", "https://example.com/phone-x-2.jpg"],
        isPublished: true,
        vendorId,
        categoryId: electronicsSubcategories[0].id,
        inventory: {
          create: {
            quantity: 100,
            vendorId,
          },
        },
        slug:"",
      },
    }),
    prisma.product.create({
      data: {
        name: "Laptop Pro",
        description: "Powerful laptop for professionals",
        price: 1499.99,
        discountPrice: 1399.99,
        quantity: 50,
        sku: "LAPTOP-PRO-001",
        images: ["https://example.com/laptop-pro-1.jpg", "https://example.com/laptop-pro-2.jpg"],
        isPublished: true,
        vendorId,
        slug:"",
        categoryId: electronicsSubcategories[1].id,
        inventory: {
          create: {
            quantity: 50,
            vendorId,
          },
        },
      },
    }),
  ])
  console.log("Created products:", products.map((p) => p.name).join(", "))

  // Create flash sale
  const flashSale = await prisma.flashSale.create({
    data: {
      name: "Summer Sale",
      description: "Hot deals for summer",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true,
      vendorId,
      slug:"",
      items: {
        create: [
          {
            productId: products[0].id,
            discountPercentage: 20,
            quantity: 50,
          },
          {
            productId: products[1].id,
            discountPercentage: 15,
            quantity: 25,
          },
        ],
      },
    },
  })
  console.log("Created flash sale:", flashSale.name)

  // Create coupon
  const coupon = await prisma.coupon.create({
    data: {
      code: "SUMMER20",
      description: "20% off on all products",
      discountType: "PERCENTAGE",
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
    prisma.faq.create({
      data: {
        question: "How can I track my order?",
        answer: "You can track your order in the Order History section of your account dashboard.",
        category: "Orders",
        isPublished: true,
        order: 3,
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

