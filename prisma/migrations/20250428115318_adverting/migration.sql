-- AlterTable
ALTER TABLE "AdPayment" ADD COLUMN     "currency" TEXT;

-- AlterTable
ALTER TABLE "Advertisement" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "targetUrl" TEXT;
