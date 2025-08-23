-- DropForeignKey
ALTER TABLE "shippings" DROP CONSTRAINT "shippings_vendorId_fkey";

-- AlterTable
ALTER TABLE "shippings" ALTER COLUMN "vendorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "vendor_shippings" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "shippingId" TEXT NOT NULL,
    "priceOverride" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vendor_shippings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_shippings_vendorId_shippingId_key" ON "vendor_shippings"("vendorId", "shippingId");

-- AddForeignKey
ALTER TABLE "shippings" ADD CONSTRAINT "shippings_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_shippings" ADD CONSTRAINT "vendor_shippings_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_shippings" ADD CONSTRAINT "vendor_shippings_shippingId_fkey" FOREIGN KEY ("shippingId") REFERENCES "shippings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
