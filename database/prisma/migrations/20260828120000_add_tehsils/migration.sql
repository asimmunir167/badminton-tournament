-- CreateTable
CREATE TABLE "tehsils" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tehsils_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "tehsil_id" TEXT;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "tehsil_id" TEXT;

-- AlterEnum (PostgreSQL: add new enum value)
ALTER TYPE "TournamentFormat" ADD VALUE IF NOT EXISTS 'TEHSIL_KNOCKOUT';

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tehsils_district_id_name_key" ON "tehsils"("district_id", "name");

-- AddForeignKey
ALTER TABLE "tehsils" ADD CONSTRAINT "tehsils_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "players" ADD CONSTRAINT "players_tehsil_id_fkey" FOREIGN KEY ("tehsil_id") REFERENCES "tehsils"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_tehsil_id_fkey" FOREIGN KEY ("tehsil_id") REFERENCES "tehsils"("id") ON DELETE SET NULL ON UPDATE CASCADE;
