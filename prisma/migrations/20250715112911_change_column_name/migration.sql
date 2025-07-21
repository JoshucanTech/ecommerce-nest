/*
  Warnings:

  - Added the required column `deliveryTime` to the `shipping_options` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "shipping_options" ADD COLUMN     "deliveryTime" TEXT NOT NULL;
