-- CreateEnum
CREATE TYPE "ShippingType" AS ENUM ('STANDARD', 'EXPEDITED', 'TWO_DAY', 'ONE_DAY', 'SAME_DAY', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('MERCHANT', 'PLATFORM', 'PRIME');

-- AlterTable
ALTER TABLE "shipping_zones" ADD COLUMN     "city" TEXT,
ADD COLUMN     "maxPrice" DOUBLE PRECISION,
ADD COLUMN     "maxWeight" DOUBLE PRECISION,
ADD COLUMN     "minPrice" DOUBLE PRECISION,
ADD COLUMN     "minWeight" DOUBLE PRECISION,
ADD COLUMN     "price" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "shippings" ADD COLUMN     "shippingType" "ShippingType" NOT NULL DEFAULT 'STANDARD',
ALTER COLUMN "price" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "vendor_shippings" ADD COLUMN     "fulfillment" "FulfillmentType" NOT NULL DEFAULT 'MERCHANT';
