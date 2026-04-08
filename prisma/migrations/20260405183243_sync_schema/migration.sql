-- AlterTable
ALTER TABLE "users" ADD COLUMN     "assignedCountry" TEXT,
ADD COLUMN     "assignedRegion" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "permissionLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "team" TEXT;

-- AlterTable
ALTER TABLE "vendor_applications" ADD COLUMN     "accentColor" TEXT DEFAULT '#ffffff',
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "themeColor" TEXT DEFAULT '#000000';

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "accentColor" TEXT DEFAULT '#ffffff',
ADD COLUMN     "customCSS" TEXT,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "themeColor" TEXT DEFAULT '#000000';
