/*
  Warnings:

  - The `status` column on the `AdPayment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `userId` on the `Advertisement` table. All the data in the column will be lost.
  - The `status` column on the `Advertisement` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[advertisementId,date,platform]` on the table `AdAnalytics` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `AdPayment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[advertisementId,platform,name]` on the table `AdPlatformConfig` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `platform` to the `AdAnalytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AdAnalytics` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `paymentMethod` on the `AdPayment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `advertisementId` to the `AdPlatformConfig` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `platform` on the `AdPlatformConfig` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `bidAmount` to the `Advertisement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricingModel` to the `Advertisement` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Advertisement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'REJECTED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('FEATURED_PRODUCT', 'IN_APP_BANNER', 'IN_APP_POPUP', 'EXTERNAL', 'CAROUSEL');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('CPC', 'CPM', 'CPV', 'FIXED');

-- DropForeignKey
ALTER TABLE "AdPayment" DROP CONSTRAINT "AdPayment_advertisementId_fkey";

-- DropForeignKey
ALTER TABLE "Advertisement" DROP CONSTRAINT "Advertisement_userId_fkey";

-- DropForeignKey
ALTER TABLE "Advertisement" DROP CONSTRAINT "Advertisement_vendorId_fkey";

-- DropIndex
DROP INDEX "AdAnalytics_advertisementId_date_key";

-- DropIndex
DROP INDEX "AdPlatformConfig_platform_name_key";

-- AlterTable
ALTER TABLE "AdAnalytics" ADD COLUMN     "avgSessionDuration" DOUBLE PRECISION,
ADD COLUMN     "bounceRate" DOUBLE PRECISION,
ADD COLUMN     "costPerClick" DOUBLE PRECISION,
ADD COLUMN     "costPerConversion" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "impressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platform" "AdPlatform" NOT NULL,
ADD COLUMN     "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AdPayment" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "invoiceUrl" TEXT,
ADD COLUMN     "transactionId" TEXT,
ALTER COLUMN "currency" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL;

-- AlterTable
ALTER TABLE "AdPlatformConfig" ADD COLUMN     "advertisementId" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "platformAdId" TEXT,
ADD COLUMN     "platformCampaignId" TEXT,
ADD COLUMN     "platformClicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformConversions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformImpressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "platformStatus" TEXT,
ADD COLUMN     "settings" JSONB,
DROP COLUMN "platform",
ADD COLUMN     "platform" "AdPlatform" NOT NULL;

-- AlterTable
ALTER TABLE "AdTargeting" ADD COLUMN     "browsers" TEXT[],
ADD COLUMN     "keywords" TEXT[];

-- AlterTable
ALTER TABLE "Advertisement" DROP COLUMN "userId",
ADD COLUMN     "adText" TEXT,
ADD COLUMN     "bidAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "callToAction" TEXT,
ADD COLUMN     "dailyBudget" DOUBLE PRECISION,
ADD COLUMN     "landingPageUrl" TEXT,
ADD COLUMN     "mediaUrls" TEXT[],
ADD COLUMN     "pricingModel" "PricingModel" NOT NULL,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "description" DROP NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "AdType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AdStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE UNIQUE INDEX "AdAnalytics_advertisementId_date_platform_key" ON "AdAnalytics"("advertisementId", "date", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "AdPayment_invoiceNumber_key" ON "AdPayment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "AdPayment_status_idx" ON "AdPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdPlatformConfig_advertisementId_platform_name_key" ON "AdPlatformConfig"("advertisementId", "platform", "name");

-- CreateIndex
CREATE INDEX "Advertisement_status_idx" ON "Advertisement"("status");

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPlatformConfig" ADD CONSTRAINT "AdPlatformConfig_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPayment" ADD CONSTRAINT "AdPayment_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
