-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_RECEIVED';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "entry_fee" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "payment_instructions" TEXT;

