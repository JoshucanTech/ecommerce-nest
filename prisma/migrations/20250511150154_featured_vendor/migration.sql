-- AlterEnum
ALTER TYPE "AdType" ADD VALUE 'FEATURED_VENDOR';

-- AlterTable
ALTER TABLE "AdUserInteraction" ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "Advertisement" ADD COLUMN     "maxVendors" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "VendorAdvertisement" (
    "id" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "customTitle" TEXT,
    "customDescription" TEXT,
    "customImageUrl" TEXT,
    "customBadge" TEXT,
    "customThemeColor" TEXT,
    "highlightText" TEXT,
    "featuredProductIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAdvertisement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorAdvertisement_advertisementId_idx" ON "VendorAdvertisement"("advertisementId");

-- CreateIndex
CREATE INDEX "VendorAdvertisement_vendorId_idx" ON "VendorAdvertisement"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAdvertisement_advertisementId_vendorId_key" ON "VendorAdvertisement"("advertisementId", "vendorId");

-- CreateIndex
CREATE INDEX "AdUserInteraction_vendorId_idx" ON "AdUserInteraction"("vendorId");

-- AddForeignKey
ALTER TABLE "AdUserInteraction" ADD CONSTRAINT "AdUserInteraction_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAdvertisement" ADD CONSTRAINT "VendorAdvertisement_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAdvertisement" ADD CONSTRAINT "VendorAdvertisement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
