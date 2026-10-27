import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import type { CreateCourtInput, UpdateCourtInput } from "./courts.validation";

const ENTRY_INCLUDE = {
  include: {
    player1: { select: { id: true, fullName: true } },
    player2: { select: { id: true, fullName: true } },
  },
} as const;

async function attachMatchInfo<T extends { id: string }>(court: T) {
  const [currentMatch, nextMatch] = await Promise.all([
    prisma.match.findFirst({
      where: { courtId: court.id, status: "LIVE" },
      include: { entry1: ENTRY_INCLUDE, entry2: ENTRY_INCLUDE, category: true },
    }),
    prisma.match.findFirst({
      where: { courtId: court.id, status: { in: ["SCHEDULED", "STARTING_SOON"] } },
      orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      include: { entry1: ENTRY_INCLUDE, entry2: ENTRY_INCLUDE, category: true },
    }),
  ]);
  return { ...court, currentMatch, nextMatch };
}

export async function listCourtsForTournament(tournamentId: string) {
  const courts = await prisma.court.findMany({ where: { tournamentId }, orderBy: { name: "asc" } });
  return Promise.all(courts.map((c) => attachMatchInfo(c)));
}

export async function getCourt(id: string) {
  const court = await prisma.court.findUnique({ where: { id } });
  if (!court) {
    throw new ApiError(404, "Court not found");
  }
  return court;
}

export async function getCourtWithMatchInfo(id: string) {
  const court = await getCourt(id);
  return attachMatchInfo(court);
}

export async function createCourt(tournamentId: string, input: CreateCourtInput) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }
  const existing = await prisma.court.findFirst({ where: { tournamentId, name: input.name } });
  if (existing) {
    throw new ApiError(409, "A court with this name already exists in this tournament");
  }
  return prisma.court.create({ data: { tournamentId, name: input.name } });
}

export async function updateCourt(id: string, input: UpdateCourtInput) {
  const court = await getCourt(id);
  if (input.name) {
    const conflict = await prisma.court.findFirst({
      where: { tournamentId: court.tournamentId, name: input.name, id: { not: id } },
    });
    if (conflict) {
      throw new ApiError(409, "A court with this name already exists in this tournament");
    }
  }
  return prisma.court.update({ where: { id }, data: input });
}

export async function deleteCourt(id: string) {
  await getCourt(id);
  const matchCount = await prisma.match.count({ where: { courtId: id } });
  if (matchCount > 0) {
    throw new ApiError(409, "Cannot delete a court that has matches assigned to it");
  }
  await prisma.court.delete({ where: { id } });
}
