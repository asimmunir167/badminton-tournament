-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN "payment_accounts" JSONB;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "proof_url" TEXT;
