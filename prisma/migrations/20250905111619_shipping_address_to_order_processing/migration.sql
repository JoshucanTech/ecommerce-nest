/*
  Warnings:

  - Made the column `userId` on table `orders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tax` on table `orders` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK', 'GIFT', 'BUSINESS', 'OTHER');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CONFIRMED';

-- DropForeignKey
ALTER TABLE "deliveries" DROP CONSTRAINT "deliveries_orderId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "pickupTime" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "userId" TEXT,
ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "actualDelivery" TIMESTAMP(3),
ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "estimatedDelivery" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "riderId" TEXT,
ADD COLUMN     "shippingAddressId" TEXT,
ADD COLUMN     "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "trackingNumber" TEXT,
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "tax" SET NOT NULL,
ALTER COLUMN "tax" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "shipping_addresses" (
    "id" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "nickname" TEXT,
    "addressType" "AddressType" NOT NULL DEFAULT 'OTHER',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "sharedFromId" TEXT,

    CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_addresses" (
    "id" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "sharedWithId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "shared_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipping_addresses_userId_idx" ON "shipping_addresses"("userId");

-- CreateIndex
CREATE INDEX "shipping_addresses_country_postalCode_idx" ON "shipping_addresses"("country", "postalCode");

-- CreateIndex
CREATE UNIQUE INDEX "shared_addresses_addressId_sharedWithId_key" ON "shared_addresses"("addressId", "sharedWithId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "shipping_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_sharedFromId_fkey" FOREIGN KEY ("sharedFromId") REFERENCES "shipping_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_addresses" ADD CONSTRAINT "shared_addresses_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_addresses" ADD CONSTRAINT "shared_addresses_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_addresses" ADD CONSTRAINT "shared_addresses_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "shipping_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
