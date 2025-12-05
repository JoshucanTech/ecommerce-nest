-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "accountActivityEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "chatNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "newProductEmails" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promotionNotifications" BOOLEAN NOT NULL DEFAULT false;
