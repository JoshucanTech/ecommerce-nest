/*
  Warnings:

  - You are about to drop the `VendorAdvertisement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VendorAdvertisement" DROP CONSTRAINT "VendorAdvertisement_advertisementId_fkey";

-- DropForeignKey
ALTER TABLE "VendorAdvertisement" DROP CONSTRAINT "VendorAdvertisement_vendorId_fkey";

-- DropTable
DROP TABLE "VendorAdvertisement";
