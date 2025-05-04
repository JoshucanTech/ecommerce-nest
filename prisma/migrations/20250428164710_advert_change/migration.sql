/*
  Warnings:

  - You are about to drop the column `avgSessionDuration` on the `AdAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `bounceRate` on the `AdAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `costPerClick` on the `AdAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `costPerConversion` on the `AdAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `AdAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `impressions` on the `AdAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `AdAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `spend` on the `AdAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `AdAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNumber` on the `AdPayment` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceUrl` on the `AdPayment` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `AdPayment` table. All the data in the column will be lost.
  - The `status` column on the `AdPayment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `advertisementId` on the `AdPlatformConfig` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `AdPlatformConfig` table. All the data in the column will be lost.
  - You are about to drop the column `platformAdId` on the `AdPlatformConfig` table. All the data in the column will be lost.
  - You are about to drop the column `platformCampaignId` on the `AdPlatformConfig` table. All the data in the column will be lost.
  - You are about to drop the column `platformClicks` on the `AdPlatformConfig` table. All the data in the column will be lost.
  - You are about to drop the column `platformConversions` on the `AdPlatformConfig` table. All the data in the column will be lost.
  - You are about to drop the column `platformImpressions` on the `AdPlatformConfig` table. All the data in the column will be lost.
  - You are about to drop the column `platformSpend` on the `AdPlatformConfig` table. All the data in the column will be lost.
  - You are about to drop the column `platformStatus` on the `AdPlatformConfig` table. All the data in the column will be lost.
  - You are about to drop the column `settings` on the `AdPlatformConfig` table. All the data in the column will be lost.
  - You are about to drop the column `ageMax` on the `AdTargeting` table. All the data in the column will be lost.
  - You are about to drop the column `ageMin` on the `AdTargeting` table. All the data in the column will be lost.
  - You are about to drop the column `browsers` on the `AdTargeting` table. All the data in the column will be lost.
  - You are about to drop the column `keywords` on the `AdTargeting` table. All the data in the column will be lost.
  - You are about to drop the column `adText` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `bidAmount` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `callToAction` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `dailyBudget` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `landingPageUrl` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `mediaUrls` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `pricingModel` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `reviewNotes` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `spend` on the `Advertisement` table. All the data in the column will be lost.
  - The `status` column on the `Advertisement` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[advertisementId,date]` on the table `AdAnalytics` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[platform,name]` on the table `AdPlatformConfig` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `paymentMethod` on the `AdPayment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `currency` on table `AdPayment` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `config` to the `AdPlatformConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `AdPlatformConfig` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `platform` on the `AdPlatformConfig` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `description` on table `Advertisement` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `type` on the `Advertisement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "AdPayment" DROP CONSTRAINT "AdPayment_advertisementId_fkey";

-- DropForeignKey
ALTER TABLE "AdPlatformConfig" DROP CONSTRAINT "AdPlatformConfig_advertisementId_fkey";

-- DropForeignKey
ALTER TABLE "Advertisement" DROP CONSTRAINT "Advertisement_reviewedBy_fkey";

-- DropForeignKey
ALTER TABLE "Advertisement" DROP CONSTRAINT "Advertisement_vendorId_fkey";

-- DropIndex
DROP INDEX "AdAnalytics_advertisementId_date_platform_key";

-- DropIndex
DROP INDEX "AdPayment_invoiceNumber_key";

-- DropIndex
DROP INDEX "AdPlatformConfig_advertisementId_platform_key";

-- AlterTable
ALTER TABLE "AdAnalytics" DROP COLUMN "avgSessionDuration",
DROP COLUMN "bounceRate",
DROP COLUMN "costPerClick",
DROP COLUMN "costPerConversion",
DROP COLUMN "createdAt",
DROP COLUMN "impressions",
DROP COLUMN "platform",
DROP COLUMN "spend",
DROP COLUMN "updatedAt",
ADD COLUMN     "conversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "AdPayment" DROP COLUMN "invoiceNumber",
DROP COLUMN "invoiceUrl",
DROP COLUMN "transactionId",
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "transactionReference" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" TEXT NOT NULL,
ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "currency" SET DEFAULT 'USD';

-- AlterTable
ALTER TABLE "AdPlatformConfig" DROP COLUMN "advertisementId",
DROP COLUMN "metadata",
DROP COLUMN "platformAdId",
DROP COLUMN "platformCampaignId",
DROP COLUMN "platformClicks",
DROP COLUMN "platformConversions",
DROP COLUMN "platformImpressions",
DROP COLUMN "platformSpend",
DROP COLUMN "platformStatus",
DROP COLUMN "settings",
ADD COLUMN     "config" JSONB NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
DROP COLUMN "platform",
ADD COLUMN     "platform" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AdTargeting" DROP COLUMN "ageMax",
DROP COLUMN "ageMin",
DROP COLUMN "browsers",
DROP COLUMN "keywords",
ADD COLUMN     "excludedAudience" JSONB,
ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "maxAge" INTEGER,
ADD COLUMN     "minAge" INTEGER;

-- AlterTable
ALTER TABLE "Advertisement" DROP COLUMN "adText",
DROP COLUMN "bidAmount",
DROP COLUMN "callToAction",
DROP COLUMN "dailyBudget",
DROP COLUMN "landingPageUrl",
DROP COLUMN "mediaUrls",
DROP COLUMN "pricingModel",
DROP COLUMN "reviewNotes",
DROP COLUMN "spend",
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "videoUrl" TEXT,
ALTER COLUMN "description" SET NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "budget" DROP NOT NULL;

-- DropEnum
DROP TYPE "AdStatus";

-- DropEnum
DROP TYPE "AdType";

-- DropEnum
DROP TYPE "PricingModel";

-- CreateTable
CREATE TABLE "AdUserInteraction" (
    "id" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,
    "userId" TEXT,
    "interactionType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversionValue" DOUBLE PRECISION,
    "metadata" JSONB,
    "deviceInfo" JSONB,
    "ipAddress" TEXT,
    "referrer" TEXT,

    CONSTRAINT "AdUserInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPlatformReference" (
    "id" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlatformReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdUserInteraction_advertisementId_idx" ON "AdUserInteraction"("advertisementId");

-- CreateIndex
CREATE INDEX "AdUserInteraction_userId_idx" ON "AdUserInteraction"("userId");

-- CreateIndex
CREATE INDEX "AdUserInteraction_interactionType_idx" ON "AdUserInteraction"("interactionType");

-- CreateIndex
CREATE INDEX "AdUserInteraction_timestamp_idx" ON "AdUserInteraction"("timestamp");

-- CreateIndex
CREATE INDEX "AdPlatformReference_platform_idx" ON "AdPlatformReference"("platform");

-- CreateIndex
CREATE INDEX "AdPlatformReference_status_idx" ON "AdPlatformReference"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdPlatformReference_advertisementId_platform_key" ON "AdPlatformReference"("advertisementId", "platform");

-- CreateIndex
CREATE INDEX "AdAnalytics_advertisementId_idx" ON "AdAnalytics"("advertisementId");

-- CreateIndex
CREATE INDEX "AdAnalytics_date_idx" ON "AdAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AdAnalytics_advertisementId_date_key" ON "AdAnalytics"("advertisementId", "date");

-- CreateIndex
CREATE INDEX "AdPayment_advertisementId_idx" ON "AdPayment"("advertisementId");

-- CreateIndex
CREATE INDEX "AdPayment_status_idx" ON "AdPayment"("status");

-- CreateIndex
CREATE INDEX "AdPayment_createdAt_idx" ON "AdPayment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdPlatformConfig_platform_name_key" ON "AdPlatformConfig"("platform", "name");

-- CreateIndex
CREATE INDEX "Advertisement_vendorId_idx" ON "Advertisement"("vendorId");

-- CreateIndex
CREATE INDEX "Advertisement_status_idx" ON "Advertisement"("status");

-- CreateIndex
CREATE INDEX "Advertisement_startDate_idx" ON "Advertisement"("startDate");

-- CreateIndex
CREATE INDEX "Advertisement_endDate_idx" ON "Advertisement"("endDate");

-- AddForeignKey
ALTER TABLE "AdUserInteraction" ADD CONSTRAINT "AdUserInteraction_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdUserInteraction" ADD CONSTRAINT "AdUserInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPlatformReference" ADD CONSTRAINT "AdPlatformReference_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPayment" ADD CONSTRAINT "AdPayment_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
