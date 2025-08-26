/*
  Warnings:

  - You are about to drop the column `vendorId` on the `shippings` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "shippings" DROP CONSTRAINT "shippings_vendorId_fkey";

-- AlterTable
ALTER TABLE "shippings" DROP COLUMN "vendorId";

-- CreateTable
CREATE TABLE "_ShippingToVendor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ShippingToVendor_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ShippingToVendor_B_index" ON "_ShippingToVendor"("B");

-- AddForeignKey
ALTER TABLE "_ShippingToVendor" ADD CONSTRAINT "_ShippingToVendor_A_fkey" FOREIGN KEY ("A") REFERENCES "shippings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShippingToVendor" ADD CONSTRAINT "_ShippingToVendor_B_fkey" FOREIGN KEY ("B") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
