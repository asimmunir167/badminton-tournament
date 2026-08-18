import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import type { CreateTournamentInput, UpdateTournamentInput } from "./tournaments.validation";

const DEFAULT_SCORING_CONFIG = { pointsPerGame: 21, bestOf: 3, capAt: 30 };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "tournament";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.tournament.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export async function listTournaments() {
  return prisma.tournament.findMany({ orderBy: { startDate: "desc" } });
}

export async function getTournament(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { admins: { include: { user: { select: { id: true, fullName: true } } } } },
  });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }
  return tournament;
}

export async function createTournament(input: CreateTournamentInput, createdById: string) {
  const { scoringConfig, ...rest } = input;
  const slug = await uniqueSlug(input.name);

  return prisma.tournament.create({
    data: {
      ...rest,
      slug,
      createdById,
      scoringConfig: { ...DEFAULT_SCORING_CONFIG, ...scoringConfig },
    },
  });
}

export async function updateTournament(id: string, input: UpdateTournamentInput) {
  const existing = await getTournament(id);
  const { scoringConfig, ...rest } = input;

  return prisma.tournament.update({
    where: { id },
    data: {
      ...rest,
      ...(scoringConfig
        ? { scoringConfig: { ...(existing.scoringConfig as Prisma.JsonObject), ...scoringConfig } }
        : {}),
    },
  });
}

export async function deleteTournament(id: string) {
  await getTournament(id);
  await prisma.tournament.delete({ where: { id } });
}

export async function assignAdmin(tournamentId: string, userId: string) {
  await getTournament(tournamentId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return prisma.tournamentAdmin.upsert({
    where: { tournamentId_userId: { tournamentId, userId } },
    update: {},
    create: { tournamentId, userId },
  });
}

export async function removeAdmin(tournamentId: string, userId: string) {
  await prisma.tournamentAdmin.deleteMany({ where: { tournamentId, userId } });
}

export async function isTournamentAdmin(tournamentId: string, userId: string): Promise<boolean> {
  const link = await prisma.tournamentAdmin.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });
  return !!link;
}
