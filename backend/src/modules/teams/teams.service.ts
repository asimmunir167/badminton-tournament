import { TeamStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import type { CreateTeamInput, UpdateTeamInput } from "./teams.validation";

export async function listTeamsForTournament(tournamentId: string) {
  return prisma.team.findMany({ where: { tournamentId }, orderBy: { name: "asc" } });
}

export async function getTeam(id: string) {
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) {
    throw new ApiError(404, "Team not found");
  }
  return team;
}

export async function createTeam(tournamentId: string, input: CreateTeamInput, managerUserId: string | null) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  const district = await prisma.district.findUnique({ where: { id: input.districtId } });
  if (!district) {
    throw new ApiError(404, "District not found");
  }

  const existing = await prisma.team.findFirst({ where: { tournamentId, name: input.name } });
  if (existing) {
    throw new ApiError(409, "A team with this name already exists in this tournament");
  }

  if (tournament.maxTeams) {
    const count = await prisma.team.count({ where: { tournamentId } });
    if (count >= tournament.maxTeams) {
      throw new ApiError(409, "This tournament has reached its maximum number of teams");
    }
  }

  return prisma.team.create({ data: { ...input, tournamentId, managerUserId } });
}

export async function updateTeam(id: string, input: UpdateTeamInput) {
  const team = await getTeam(id);

  if (input.name) {
    const conflict = await prisma.team.findFirst({
      where: { tournamentId: team.tournamentId, name: input.name, id: { not: id } },
    });
    if (conflict) {
      throw new ApiError(409, "A team with this name already exists in this tournament");
    }
  }

  return prisma.team.update({ where: { id }, data: input });
}

export async function updateTeamStatus(id: string, status: TeamStatus) {
  await getTeam(id);
  return prisma.team.update({ where: { id }, data: { status } });
}

export async function deleteTeam(id: string) {
  await getTeam(id);
  const playerCount = await prisma.player.count({ where: { teamId: id } });
  if (playerCount > 0) {
    throw new ApiError(409, "Cannot delete a team that already has players");
  }
  await prisma.team.delete({ where: { id } });
}
