import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import type { CreateRefereeInput, UpdateRefereeInput } from "./referees.validation";

const USER_SELECT = { id: true, fullName: true, phone: true, email: true } as const;

export async function listRefereesForTournament(tournamentId: string) {
  return prisma.referee.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: USER_SELECT } },
  });
}

export async function getReferee(id: string) {
  const referee = await prisma.referee.findUnique({
    where: { id },
    include: { user: { select: USER_SELECT } },
  });
  if (!referee) {
    throw new ApiError(404, "Referee not found");
  }
  return referee;
}

export async function createReferee(tournamentId: string, input: CreateRefereeInput) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const existing = await prisma.referee.findUnique({
    where: { userId_tournamentId: { userId: input.userId, tournamentId } },
  });
  if (existing) {
    throw new ApiError(409, "This user is already a referee for this tournament");
  }

  return prisma.referee.create({
    data: { tournamentId, userId: input.userId, certificationLevel: input.certificationLevel },
  });
}

export async function updateReferee(id: string, input: UpdateRefereeInput) {
  await getReferee(id);
  return prisma.referee.update({ where: { id }, data: input });
}

export async function deleteReferee(id: string) {
  await getReferee(id);
  const matchCount = await prisma.match.count({ where: { refereeId: id } });
  if (matchCount > 0) {
    throw new ApiError(409, "Cannot delete a referee who has matches assigned to them");
  }
  await prisma.referee.delete({ where: { id } });
}
