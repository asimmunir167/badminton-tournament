import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";

const PLAYER_SELECT = { select: { id: true, fullName: true } } as const;
const ENTRY_INCLUDE = {
  include: { player1: PLAYER_SELECT, player2: PLAYER_SELECT },
} as const;

export async function getSpectatorTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      venue: true,
      startDate: true,
      endDate: true,
      status: true,
      format: true,
      categories: { select: { id: true, name: true, type: true, gender: true }, orderBy: { name: "asc" } },
    },
  });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }
  return tournament;
}

export async function getSpectatorMatches(tournamentId: string) {
  await getSpectatorTournament(tournamentId);
  return prisma.match.findMany({
    where: { tournamentId },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }, { round: "asc" }, { matchNumber: "asc" }],
    include: {
      entry1: ENTRY_INCLUDE,
      entry2: ENTRY_INCLUDE,
      winnerEntry: ENTRY_INCLUDE,
      court: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      games: { orderBy: { gameNumber: "asc" } },
    },
  });
}

export async function getSpectatorLive(tournamentId: string) {
  await getSpectatorTournament(tournamentId);
  return prisma.match.findMany({
    where: { tournamentId, status: { in: ["LIVE", "STARTING_SOON"] } },
    orderBy: [{ status: "asc" }, { scheduledTime: "asc" }],
    include: {
      entry1: ENTRY_INCLUDE,
      entry2: ENTRY_INCLUDE,
      court: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      games: { orderBy: { gameNumber: "asc" } },
    },
  });
}

export async function getSpectatorCourts(tournamentId: string) {
  await getSpectatorTournament(tournamentId);
  const courts = await prisma.court.findMany({
    where: { tournamentId },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    courts.map(async (court) => {
      const [currentMatch, nextMatch] = await Promise.all([
        prisma.match.findFirst({
          where: { courtId: court.id, status: "LIVE" },
          include: { entry1: ENTRY_INCLUDE, entry2: ENTRY_INCLUDE, category: { select: { name: true } } },
        }),
        prisma.match.findFirst({
          where: { courtId: court.id, status: { in: ["SCHEDULED", "STARTING_SOON"] } },
          orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
          include: { entry1: ENTRY_INCLUDE, entry2: ENTRY_INCLUDE, category: { select: { name: true } } },
        }),
      ]);
      return { ...court, currentMatch, nextMatch };
    }),
  );
}
