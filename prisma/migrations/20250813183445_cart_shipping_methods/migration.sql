-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "shippingId" TEXT;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_shippingId_fkey" FOREIGN KEY ("shippingId") REFERENCES "shippings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
