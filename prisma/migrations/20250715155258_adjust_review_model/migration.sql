-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "helpful" INTEGER,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "rating" DROP NOT NULL;
