-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'DISPUTED';

-- AlterTable
ALTER TABLE "AdPayment" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "refundedAmount" DOUBLE PRECISION,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
