/*
  Warnings:

  - You are about to drop the column `productId` on the `Advertisement` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Advertisement" DROP CONSTRAINT "Advertisement_productId_fkey";

-- AlterTable
ALTER TABLE "Advertisement" DROP COLUMN "productId",
ADD COLUMN     "maxProducts" INTEGER NOT NULL DEFAULT 1;
