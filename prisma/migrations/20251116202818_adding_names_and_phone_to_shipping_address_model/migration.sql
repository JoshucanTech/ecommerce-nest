-- AlterTable
ALTER TABLE "shipping_addresses" ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" INTEGER NOT NULL DEFAULT 0;
