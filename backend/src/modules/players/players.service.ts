import crypto from "node:crypto";
import { PlayerStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import type { CreatePlayerInput, SearchPlayersQuery, UpdatePlayerInput } from "./players.validation";

async function generateRegistrationId(districtCode: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomInt(100000, 1000000).toString();
    const candidate = `${districtCode}-${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await prisma.player.findUnique({ where: { registrationId: candidate } });
    if (!exists) {
      return candidate;
    }
  }
  throw new ApiError(500, "Failed to generate a unique registration ID, please retry");
}

export async function listPlayersForDistrict(districtId: string) {
  return prisma.player.findMany({ where: { districtId }, orderBy: { fullName: "asc" } });
}

export async function getPlayer(id: string) {
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) {
    throw new ApiError(404, "Player not found");
  }
  return player;
}

// Same as getPlayer, but with district name attached — for profile-style
// views (Partner Profile, search results) that need to display it.
export async function getPlayerWithDistrict(id: string) {
  const player = await prisma.player.findUnique({
    where: { id },
    include: { district: { select: { id: true, name: true } } },
  });
  if (!player) {
    throw new ApiError(404, "Player not found");
  }
  return player;
}

export async function getMyPlayerProfile(userId: string) {
  const player = await prisma.player.findUnique({ where: { userId } });
  if (!player) {
    throw new ApiError(404, "No player profile exists for this account yet");
  }
  return player;
}

export async function createPlayer(districtId: string, input: CreatePlayerInput, userId: string | null) {
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) {
    throw new ApiError(404, "District not found");
  }

  if (input.teamId) {
    const team = await prisma.team.findUnique({ where: { id: input.teamId } });
    if (!team) {
      throw new ApiError(404, "Team not found");
    }
    if (team.districtId !== districtId) {
      throw new ApiError(400, "Team does not belong to this district");
    }
  }

  if (userId) {
    const existingProfile = await prisma.player.findUnique({ where: { userId } });
    if (existingProfile) {
      throw new ApiError(409, "This account already has a player profile");
    }
  }

  const registrationId = await generateRegistrationId(district.code);

  return prisma.player.create({ data: { ...input, districtId, userId, registrationId } });
}

export async function updatePlayer(id: string, input: UpdatePlayerInput) {
  const player = await getPlayer(id);

  if (input.teamId) {
    const team = await prisma.team.findUnique({ where: { id: input.teamId } });
    if (!team) {
      throw new ApiError(404, "Team not found");
    }
    if (team.districtId !== player.districtId) {
      throw new ApiError(400, "Team does not belong to this player's district");
    }
  }

  return prisma.player.update({ where: { id }, data: input });
}

export async function updatePlayerStatus(id: string, status: PlayerStatus) {
  await getPlayer(id);
  return prisma.player.update({ where: { id }, data: { status } });
}

export async function deletePlayer(id: string) {
  await getPlayer(id);
  const entryCount = await prisma.categoryEntry.count({
    where: { OR: [{ player1Id: id }, { player2Id: id }] },
  });
  if (entryCount > 0) {
    throw new ApiError(409, "Cannot delete a player who is already entered in a category draw");
  }
  await prisma.player.delete({ where: { id } });
}

// "Find Partner" directory: browse/search other players, optionally scoped
// to a district or preferred doubles category.
export async function searchPlayers(query: SearchPlayersQuery, excludePlayerId?: string) {
  return prisma.player.findMany({
    where: {
      ...(query.districtId ? { districtId: query.districtId } : {}),
      ...(query.categoryGender ? { preferredCategoryGender: query.categoryGender } : {}),
      ...(query.search ? { fullName: { contains: query.search, mode: "insensitive" } } : {}),
      ...(excludePlayerId ? { id: { not: excludePlayerId } } : {}),
    },
    include: { district: { select: { id: true, name: true } } },
    orderBy: { fullName: "asc" },
    take: 50,
  });
}

// Real, match-derived stats — never fabricated. rating is a simple formula
// off actual win rate (3.0 base +/- up to 2.0), not a stored/faked value;
// it's null (shown as "New Player") until the player has a completed match.
export async function getPlayerStats(playerId: string) {
  const entries = await prisma.categoryEntry.findMany({
    where: { OR: [{ player1Id: playerId }, { player2Id: playerId }] },
    select: { id: true },
  });
  const entryIds = entries.map((e) => e.id);

  const [wins, losses] = entryIds.length
    ? await Promise.all([
        prisma.result.count({ where: { winnerEntryId: { in: entryIds } } }),
        prisma.result.count({ where: { loserEntryId: { in: entryIds } } }),
      ])
    : [0, 0];

  const matches = wins + losses;
  const rating = matches > 0 ? Math.round((3 + (wins / matches) * 2) * 10) / 10 : null;

  return { matches, wins, losses, rating };
}
