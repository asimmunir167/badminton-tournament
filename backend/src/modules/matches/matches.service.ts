import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import type { UpdateMatchInput } from "./matches.validation";

const PLAYER_SELECT = { select: { id: true, fullName: true } } as const;
const ENTRY_INCLUDE = { include: { player1: PLAYER_SELECT, player2: PLAYER_SELECT } } as const;

export async function listMatchesForTournament(tournamentId: string) {
  return prisma.match.findMany({
    where: { tournamentId },
    orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
    include: { entry1: ENTRY_INCLUDE, entry2: ENTRY_INCLUDE, winnerEntry: true, court: true, category: true },
  });
}

export async function getMatch(id: string) {
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      entry1: ENTRY_INCLUDE,
      entry2: ENTRY_INCLUDE,
      winnerEntry: true,
      court: true,
      category: true,
      result: true,
    },
  });
  if (!match) {
    throw new ApiError(404, "Match not found");
  }
  return match;
}

export async function updateMatch(id: string, input: UpdateMatchInput) {
  const match = await getMatch(id);
  if (match.status === "COMPLETED") {
    throw new ApiError(409, "Cannot edit a completed match");
  }
  if (input.status === "COMPLETED") {
    throw new ApiError(400, "Use the record-winner endpoint to complete a match");
  }

  if (input.courtId) {
    const court = await prisma.court.findUnique({ where: { id: input.courtId } });
    if (!court) {
      throw new ApiError(404, "Court not found");
    }
  }
  if (input.refereeId) {
    const referee = await prisma.referee.findUnique({ where: { id: input.refereeId } });
    if (!referee) {
      throw new ApiError(404, "Referee not found");
    }
  }

  return prisma.match.update({ where: { id }, data: input });
}

export async function recordWinner(id: string, winnerEntryId: string) {
  const match = await getMatch(id);

  if (match.status === "COMPLETED") {
    throw new ApiError(409, "This match has already been completed");
  }
  if (!match.entry1Id || !match.entry2Id) {
    throw new ApiError(409, "This match does not have two entries yet");
  }
  if (winnerEntryId !== match.entry1Id && winnerEntryId !== match.entry2Id) {
    throw new ApiError(400, "winnerEntryId must be one of this match's two entries");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.match.update({
      where: { id },
      data: { status: "COMPLETED", winnerEntryId },
    });

    if (match.nextMatchId && match.nextMatchSlot !== null) {
      await tx.match.update({
        where: { id: match.nextMatchId },
        data: match.nextMatchSlot === 0 ? { entry1Id: winnerEntryId } : { entry2Id: winnerEntryId },
      });
    }

    return updated;
  });
}
