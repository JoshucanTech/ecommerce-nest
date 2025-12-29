-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "isDelivered" BOOLEAN NOT NULL DEFAULT false;
