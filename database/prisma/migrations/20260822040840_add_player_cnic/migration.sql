-- AlterTable
ALTER TABLE "players" ADD COLUMN     "cnic" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "players_cnic_key" ON "players"("cnic");

