-- CreateEnum
CREATE TYPE "PlayerLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "PairStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED');

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "playing_level" "PlayerLevel",
ADD COLUMN     "preferred_category_gender" "CategoryGender",
ADD COLUMN     "preferred_category_type" "CategoryType";

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "pair_id" TEXT;

-- CreateTable
CREATE TABLE "pairs" (
    "id" TEXT NOT NULL,
    "pair_code" TEXT NOT NULL,
    "player1_id" TEXT NOT NULL,
    "player2_id" TEXT NOT NULL,
    "status" "PairStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "pairs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pairs_pair_code_key" ON "pairs"("pair_code");

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_pair_id_fkey" FOREIGN KEY ("pair_id") REFERENCES "pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairs" ADD CONSTRAINT "pairs_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairs" ADD CONSTRAINT "pairs_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
