-- AlterTable
ALTER TABLE "products" ADD COLUMN     "returnPolicy" TEXT,
ADD COLUMN     "soldCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warrantyInfo" TEXT;
