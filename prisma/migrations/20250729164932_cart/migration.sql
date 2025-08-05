/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `carts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "cart_items_cartId_productId_key";

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "productVariantId" TEXT;

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "sessionId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "carts_sessionId_key" ON "carts"("sessionId");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
