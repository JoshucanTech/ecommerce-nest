/*
  Warnings:

  - The values [ROLES] on the enum `PermissionResource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `_UserRoles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PermissionResource_new" AS ENUM ('USERS', 'VENDORS', 'RIDERS', 'ORDERS', 'PRODUCTS', 'DELIVERIES', 'PAYMENTS', 'ANALYTICS', 'SETTINGS', 'PERMISSIONS', 'POSITIONS', 'SUB_ADMINS', 'SUPPORT_TICKETS', 'ADVERTISEMENTS', 'CATEGORIES', 'REVIEWS');
ALTER TABLE "permissions" ALTER COLUMN "resource" TYPE "PermissionResource_new" USING ("resource"::text::"PermissionResource_new");
ALTER TYPE "PermissionResource" RENAME TO "PermissionResource_old";
ALTER TYPE "PermissionResource_new" RENAME TO "PermissionResource";
DROP TYPE "PermissionResource_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "_UserRoles" DROP CONSTRAINT "_UserRoles_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserRoles" DROP CONSTRAINT "_UserRoles_B_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_roleId_fkey";

-- DropTable
DROP TABLE "_UserRoles";

-- DropTable
DROP TABLE "role_permissions";

-- DropTable
DROP TABLE "roles";

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_permissions" (
    "positionId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "position_permissions_pkey" PRIMARY KEY ("positionId","permissionId")
);

-- CreateTable
CREATE TABLE "_UserPositions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserPositions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "positions_name_key" ON "positions"("name");

-- CreateIndex
CREATE INDEX "_UserPositions_B_index" ON "_UserPositions"("B");

-- AddForeignKey
ALTER TABLE "position_permissions" ADD CONSTRAINT "position_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_permissions" ADD CONSTRAINT "position_permissions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPositions" ADD CONSTRAINT "_UserPositions_A_fkey" FOREIGN KEY ("A") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPositions" ADD CONSTRAINT "_UserPositions_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
