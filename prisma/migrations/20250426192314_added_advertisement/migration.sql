/*
  Warnings:

  - You are about to drop the column `businessAddress` on the `vendor_applications` table. All the data in the column will be lost.
  - The `documents` column on the `vendor_applications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `businessAddress` on the `vendors` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'REJECTED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('FEATURED_PRODUCT', 'IN_APP_BANNER', 'IN_APP_POPUP', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('CPC', 'CPM', 'CPV', 'FIXED');

-- CreateEnum
CREATE TYPE "AdPlatform" AS ENUM ('IN_APP', 'FACEBOOK', 'INSTAGRAM', 'TWITTER', 'WHATSAPP', 'GOOGLE_ADSENSE', 'TIKTOK', 'LINKEDIN', 'PINTEREST', 'OTHER');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "vendor_applications" DROP COLUMN "businessAddress",
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "website" TEXT,
DROP COLUMN "documents",
ADD COLUMN     "documents" JSONB;

-- AlterTable
ALTER TABLE "vendors" DROP COLUMN "businessAddress",
ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "bankInfo" JSONB,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "socialMedia" JSONB,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT,
    "type" "AdType" NOT NULL,
    "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DOUBLE PRECISION NOT NULL,
    "dailyBudget" DOUBLE PRECISION,
    "pricingModel" "PricingModel" NOT NULL,
    "bidAmount" DOUBLE PRECISION NOT NULL,
    "mediaUrls" TEXT[],
    "adText" TEXT,
    "callToAction" TEXT,
    "landingPageUrl" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdTargeting" (
    "id" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "genders" TEXT[],
    "locations" TEXT[],
    "interests" TEXT[],
    "keywords" TEXT[],
    "devices" TEXT[],
    "browsers" TEXT[],
    "customAudience" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdTargeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPlatformConfig" (
    "id" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,
    "platform" "AdPlatform" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "platformAdId" TEXT,
    "platformCampaignId" TEXT,
    "platformStatus" TEXT,
    "settings" JSONB,
    "platformImpressions" INTEGER NOT NULL DEFAULT 0,
    "platformClicks" INTEGER NOT NULL DEFAULT 0,
    "platformConversions" INTEGER NOT NULL DEFAULT 0,
    "platformSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAnalytics" (
    "id" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "platform" "AdPlatform" NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "conversionRate" DOUBLE PRECISION,
    "costPerClick" DOUBLE PRECISION,
    "costPerConversion" DOUBLE PRECISION,
    "bounceRate" DOUBLE PRECISION,
    "avgSessionDuration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPayment" (
    "id" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_addresses" (
    "id" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vendorId" TEXT,
    "vendorApplicationId" TEXT,

    CONSTRAINT "vendor_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdTargeting_advertisementId_key" ON "AdTargeting"("advertisementId");

-- CreateIndex
CREATE UNIQUE INDEX "AdPlatformConfig_advertisementId_platform_key" ON "AdPlatformConfig"("advertisementId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "AdAnalytics_advertisementId_date_platform_key" ON "AdAnalytics"("advertisementId", "date", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "AdPayment_invoiceNumber_key" ON "AdPayment"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdTargeting" ADD CONSTRAINT "AdTargeting_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPlatformConfig" ADD CONSTRAINT "AdPlatformConfig_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAnalytics" ADD CONSTRAINT "AdAnalytics_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPayment" ADD CONSTRAINT "AdPayment_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_addresses" ADD CONSTRAINT "vendor_addresses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_addresses" ADD CONSTRAINT "vendor_addresses_vendorApplicationId_fkey" FOREIGN KEY ("vendorApplicationId") REFERENCES "vendor_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
