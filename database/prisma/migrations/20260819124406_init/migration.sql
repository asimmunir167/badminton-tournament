-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'INJURED', 'WITHDRAWN', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('SINGLES', 'DOUBLES');

-- CreateEnum
CREATE TYPE "CategoryGender" AS ENUM ('MEN', 'WOMEN', 'MIXED');

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('KNOCKOUT', 'ROUND_ROBIN', 'GROUP_KNOCKOUT');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MANUAL', 'JAZZCASH', 'EASYPAISA', 'STRIPE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "CourtStatus" AS ENUM ('IDLE', 'IN_USE', 'CLOSED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'STARTING_SOON', 'LIVE', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "ScoreEventType" AS ENUM ('POINT', 'UNDO', 'PAUSE', 'RESUME', 'GAME_COMPLETE', 'MATCH_COMPLETE');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('CHAMPION', 'RUNNER_UP', 'THIRD', 'PARTICIPATION');

-- CreateEnum
CREATE TYPE "RankingEntityType" AS ENUM ('PLAYER', 'TEAM', 'DISTRICT');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'REGISTER', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REGISTRATION_APPROVED', 'REGISTRATION_REJECTED', 'MATCH_SCHEDULED', 'MATCH_STARTING_SOON', 'COURT_CHANGED', 'MATCH_LIVE', 'MATCH_RESULT', 'PLAYER_QUALIFIED', 'SEMI_FINAL', 'FINAL', 'TOURNAMENT_CHAMPION');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_info" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "logo_url" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_managers" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "district_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "registration_deadline" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "address" TEXT,
    "organizer" TEXT,
    "contact_info" TEXT,
    "rules_text" TEXT,
    "max_teams" INTEGER,
    "max_players" INTEGER,
    "format" "TournamentFormat" NOT NULL DEFAULT 'KNOCKOUT',
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "scoring_config" JSONB NOT NULL DEFAULT '{"pointsPerGame":21,"bestOf":3,"capAt":30}',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_admins" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "gender" "CategoryGender" NOT NULL,
    "age_group" TEXT,
    "max_entries" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "manager_user_id" TEXT,
    "manager_phone" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "district_id" TEXT NOT NULL,
    "team_id" TEXT,
    "full_name" TEXT NOT NULL,
    "father_name" TEXT,
    "dob" TIMESTAMP(3),
    "gender" "Gender" NOT NULL,
    "photo_url" TEXT,
    "phone" TEXT,
    "registration_id" TEXT NOT NULL,
    "id_document_url" TEXT,
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_entries" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "player1_id" TEXT NOT NULL,
    "player2_id" TEXT,
    "seed" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "team_id" TEXT,
    "player_id" TEXT,
    "category_id" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "method" "PaymentMethod" NOT NULL DEFAULT 'MANUAL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_ref" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CourtStatus" NOT NULL DEFAULT 'IDLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referees" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "certification_level" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draws" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "format" "TournamentFormat" NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "generated_by" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "draw_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "match_number" INTEGER NOT NULL,
    "entry1_id" TEXT,
    "entry2_id" TEXT,
    "scheduled_date" TIMESTAMP(3),
    "scheduled_time" TEXT,
    "court_id" TEXT,
    "referee_id" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "winner_entry_id" TEXT,
    "next_match_id" TEXT,
    "next_match_slot" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_games" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "game_number" INTEGER NOT NULL,
    "entry1_score" INTEGER NOT NULL DEFAULT 0,
    "entry2_score" INTEGER NOT NULL DEFAULT 0,
    "winner_entry_id" TEXT,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "match_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_score_events" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "game_number" INTEGER NOT NULL,
    "event_type" "ScoreEventType" NOT NULL,
    "entry_id" TEXT,
    "score_snapshot" JSONB NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "winner_entry_id" TEXT NOT NULL,
    "loser_entry_id" TEXT NOT NULL,
    "game_scores" JSONB NOT NULL,
    "duration_minutes" INTEGER,
    "finalized_by" TEXT,
    "finalized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rankings" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT,
    "category_id" TEXT,
    "entity_type" "RankingEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "silver" INTEGER NOT NULL DEFAULT 0,
    "bronze" INTEGER NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "category_id" TEXT,
    "player_id" TEXT,
    "team_id" TEXT,
    "type" "CertificateType" NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "pdf_url" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "otp_codes_target_purpose_idx" ON "otp_codes"("target", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_key" ON "districts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "district_managers_district_id_user_id_key" ON "district_managers"("district_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_slug_key" ON "tournaments"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_admins_tournament_id_user_id_key" ON "tournament_admins"("tournament_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tournament_id_name_key" ON "categories"("tournament_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_tournament_id_name_key" ON "teams"("tournament_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "players_user_id_key" ON "players"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "players_registration_id_key" ON "players"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_entries_category_id_player1_id_player2_id_key" ON "category_entries"("category_id", "player1_id", "player2_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_registration_id_key" ON "payments"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "courts_tournament_id_name_key" ON "courts"("tournament_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "referees_user_id_tournament_id_key" ON "referees"("user_id", "tournament_id");

-- CreateIndex
CREATE INDEX "matches_tournament_id_idx" ON "matches"("tournament_id");

-- CreateIndex
CREATE INDEX "matches_category_id_idx" ON "matches"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_games_match_id_game_number_key" ON "match_games"("match_id", "game_number");

-- CreateIndex
CREATE INDEX "match_score_events_match_id_idx" ON "match_score_events"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "results_match_id_key" ON "results"("match_id");

-- CreateIndex
CREATE INDEX "rankings_entity_type_entity_id_idx" ON "rankings"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificate_number_key" ON "certificates"("certificate_number");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_managers" ADD CONSTRAINT "district_managers_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_managers" ADD CONSTRAINT "district_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_admins" ADD CONSTRAINT "tournament_admins_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_admins" ADD CONSTRAINT "tournament_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_manager_user_id_fkey" FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_entries" ADD CONSTRAINT "category_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_entries" ADD CONSTRAINT "category_entries_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_entries" ADD CONSTRAINT "category_entries_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referees" ADD CONSTRAINT "referees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referees" ADD CONSTRAINT "referees_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draws" ADD CONSTRAINT "draws_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draws" ADD CONSTRAINT "draws_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_draw_id_fkey" FOREIGN KEY ("draw_id") REFERENCES "draws"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "referees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_entry1_id_fkey" FOREIGN KEY ("entry1_id") REFERENCES "category_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_entry2_id_fkey" FOREIGN KEY ("entry2_id") REFERENCES "category_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_entry_id_fkey" FOREIGN KEY ("winner_entry_id") REFERENCES "category_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_next_match_id_fkey" FOREIGN KEY ("next_match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_games" ADD CONSTRAINT "match_games_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_games" ADD CONSTRAINT "match_games_winner_entry_id_fkey" FOREIGN KEY ("winner_entry_id") REFERENCES "category_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_score_events" ADD CONSTRAINT "match_score_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_score_events" ADD CONSTRAINT "match_score_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_winner_entry_id_fkey" FOREIGN KEY ("winner_entry_id") REFERENCES "category_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_loser_entry_id_fkey" FOREIGN KEY ("loser_entry_id") REFERENCES "category_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
