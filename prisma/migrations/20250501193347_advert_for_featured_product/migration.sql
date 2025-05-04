-- AlterTable
ALTER TABLE "AdUserInteraction" ADD COLUMN     "productId" TEXT;

-- CreateTable
CREATE TABLE "ProductAdvertisement" (
    "id" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "customTitle" TEXT,
    "customDescription" TEXT,
    "customImageUrl" TEXT,
    "customPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAdvertisement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductAdvertisement_advertisementId_idx" ON "ProductAdvertisement"("advertisementId");

-- CreateIndex
CREATE INDEX "ProductAdvertisement_productId_idx" ON "ProductAdvertisement"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAdvertisement_advertisementId_productId_key" ON "ProductAdvertisement"("advertisementId", "productId");

-- AddForeignKey
ALTER TABLE "AdUserInteraction" ADD CONSTRAINT "AdUserInteraction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAdvertisement" ADD CONSTRAINT "ProductAdvertisement_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAdvertisement" ADD CONSTRAINT "ProductAdvertisement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
