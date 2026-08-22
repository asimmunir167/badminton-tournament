-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "partner_player_id" TEXT;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_partner_player_id_fkey" FOREIGN KEY ("partner_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
