/*
  Warnings:

  - You are about to drop the column `clicks` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `conversions` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `impressions` on the `Advertisement` table. All the data in the column will be lost.
  - You are about to drop the column `birthDate` on the `profiles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[appleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED');

-- AlterTable
ALTER TABLE "AdAnalytics" ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "AdPlatformConfig" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Advertisement" DROP COLUMN "clicks",
DROP COLUMN "conversions",
DROP COLUMN "impressions";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "birthDate",
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "interests" TEXT[],
ADD COLUMN     "location" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "adPreferences" JSONB,
ADD COLUMN     "marketingEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "privacySettings" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "appleId" TEXT,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "riderApplicationId" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "vendorApplicationId" TEXT,
ADD COLUMN     "verificationToken" TEXT;

-- CreateTable
CREATE TABLE "ad_clicks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,
    "platform" "AdPlatform" NOT NULL,
    "deviceType" TEXT,
    "browser" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_impressions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "advertisementId" TEXT NOT NULL,
    "platform" "AdPlatform" NOT NULL,
    "deviceType" TEXT,
    "browser" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_conversions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,
    "platform" "AdPlatform" NOT NULL,
    "conversionType" TEXT NOT NULL,
    "conversionValue" DOUBLE PRECISION,
    "orderId" TEXT,
    "productId" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_appleId_key" ON "users"("appleId");

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_vendorApplicationId_fkey" FOREIGN KEY ("vendorApplicationId") REFERENCES "vendor_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_riderApplicationId_fkey" FOREIGN KEY ("riderApplicationId") REFERENCES "rider_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_conversions" ADD CONSTRAINT "ad_conversions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_conversions" ADD CONSTRAINT "ad_conversions_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
