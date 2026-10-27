import crypto from "node:crypto";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";

const PLAYER_SELECT = {
  id: true,
  fullName: true,
  photoUrl: true,
  districtId: true,
  playingLevel: true,
  preferredCategoryType: true,
  preferredCategoryGender: true,
} as const;

async function generatePairCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomInt(1000, 10000).toString();
    const candidate = `PAIR-${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await prisma.pair.findUnique({ where: { pairCode: candidate } });
    if (!exists) {
      return candidate;
    }
  }
  throw new ApiError(500, "Failed to generate a unique pair code, please retry");
}

async function getRequesterPlayer(userId: string) {
  const player = await prisma.player.findUnique({ where: { userId } });
  if (!player) {
    throw new ApiError(404, "You need to complete your player profile first");
  }
  return player;
}

/** A player may only have one standing ACTIVE doubles partnership at a time. */
export async function getActivePairForPlayer(playerId: string) {
  return prisma.pair.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
    include: { player1: { select: PLAYER_SELECT }, player2: { select: PLAYER_SELECT } },
  });
}

async function assertPlayerIsAvailableForPairing(playerId: string, who: "You are" | "This player is") {
  const active = await getActivePairForPlayer(playerId);
  if (active) {
    throw new ApiError(
      409,
      `${who} already paired with someone else. Leave or wait until that partnership ends before sending or accepting new requests.`,
    );
  }
}

export async function listMyPairs(userId: string) {
  const player = await getRequesterPlayer(userId);
  return prisma.pair.findMany({
    where: { OR: [{ player1Id: player.id }, { player2Id: player.id }] },
    orderBy: { requestedAt: "desc" },
    include: { player1: { select: PLAYER_SELECT }, player2: { select: PLAYER_SELECT } },
  });
}

export async function listMyPairRequests(userId: string) {
  const player = await getRequesterPlayer(userId);
  return prisma.pair.findMany({
    where: { player2Id: player.id, status: "PENDING" },
    orderBy: { requestedAt: "desc" },
    include: { player1: { select: PLAYER_SELECT } },
  });
}

export async function getPair(id: string) {
  const pair = await prisma.pair.findUnique({
    where: { id },
    include: { player1: { select: PLAYER_SELECT }, player2: { select: PLAYER_SELECT } },
  });
  if (!pair) {
    throw new ApiError(404, "Pair not found");
  }
  return pair;
}

export async function createPairRequest(userId: string, partnerPlayerId: string) {
  const requester = await getRequesterPlayer(userId);
  if (partnerPlayerId === requester.id) {
    throw new ApiError(400, "You cannot pair with yourself");
  }

  const partner = await prisma.player.findUnique({ where: { id: partnerPlayerId } });
  if (!partner) {
    throw new ApiError(404, "Partner player not found");
  }

  await assertPlayerIsAvailableForPairing(requester.id, "You are");
  await assertPlayerIsAvailableForPairing(partnerPlayerId, "This player is");

  const existing = await prisma.pair.findFirst({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      OR: [
        { player1Id: requester.id, player2Id: partnerPlayerId },
        { player1Id: partnerPlayerId, player2Id: requester.id },
      ],
    },
  });
  if (existing) {
    throw new ApiError(409, "A pair request or partnership already exists between you two");
  }

  const pairCode = await generatePairCode();
  return prisma.pair.create({
    data: { pairCode, player1Id: requester.id, player2Id: partnerPlayerId },
    include: { player1: { select: PLAYER_SELECT }, player2: { select: PLAYER_SELECT } },
  });
}

async function getPairAsRecipient(id: string, userId: string) {
  const pair = await prisma.pair.findUnique({ where: { id } });
  if (!pair) {
    throw new ApiError(404, "Pair not found");
  }
  const player = await getRequesterPlayer(userId);
  if (pair.player2Id !== player.id) {
    throw new ApiError(403, "You are not the recipient of this pair request");
  }
  if (pair.status !== "PENDING") {
    throw new ApiError(409, "This pair request is no longer pending");
  }
  return pair;
}

export async function acceptPair(id: string, userId: string) {
  const pair = await getPairAsRecipient(id, userId);

  // Either player may have become locked into another ACTIVE pair while this
  // request was pending — refuse rather than creating a second partnership.
  const requesterActive = await getActivePairForPlayer(pair.player1Id);
  if (requesterActive) {
    throw new ApiError(409, "The requester is already paired with someone else");
  }
  const recipientActive = await getActivePairForPlayer(pair.player2Id);
  if (recipientActive) {
    throw new ApiError(409, "You are already paired with someone else");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.pair.update({
      where: { id: pair.id },
      data: { status: "ACTIVE", respondedAt: new Date() },
      include: { player1: { select: PLAYER_SELECT }, player2: { select: PLAYER_SELECT } },
    });

    // Once a standing pair is formed, cancel every other pending request that
    // involves either player so nobody else can still "claim" them.
    await tx.pair.updateMany({
      where: {
        id: { not: pair.id },
        status: "PENDING",
        OR: [
          { player1Id: pair.player1Id },
          { player2Id: pair.player1Id },
          { player1Id: pair.player2Id },
          { player2Id: pair.player2Id },
        ],
      },
      data: { status: "DECLINED", respondedAt: new Date() },
    });

    return updated;
  });
}

export async function declinePair(id: string, userId: string) {
  const pair = await getPairAsRecipient(id, userId);
  return prisma.pair.update({
    where: { id: pair.id },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
}
