import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { emitMatchState } from "../../lib/socket";
import { createNotification } from "../notifications/notifications.service";
import { evaluateGame, gamesToWinMatch, parseScoringConfig, ScoringConfig } from "./rules";

const PLAYER_SELECT = { select: { id: true, fullName: true } } as const;
const ENTRY_INCLUDE = { include: { player1: PLAYER_SELECT, player2: PLAYER_SELECT } } as const;

async function getMatchWithGames(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      games: { orderBy: { gameNumber: "asc" } },
      category: { include: { tournament: true } },
      entry1: ENTRY_INCLUDE,
      entry2: ENTRY_INCLUDE,
    },
  });
  if (!match) {
    throw new ApiError(404, "Match not found");
  }
  return match;
}

function getConfig(match: { category: { tournament: { scoringConfig: unknown } } }): ScoringConfig {
  return parseScoringConfig(match.category.tournament.scoringConfig);
}

async function latestPauseOrResume(matchId: string) {
  return prisma.matchScoreEvent.findFirst({
    where: { matchId, eventType: { in: ["PAUSE", "RESUME"] } },
    orderBy: { createdAt: "desc" },
  });
}

async function isPaused(matchId: string): Promise<boolean> {
  const latest = await latestPauseOrResume(matchId);
  return latest?.eventType === "PAUSE";
}

async function buildState(matchId: string) {
  const match = await getMatchWithGames(matchId);
  const config = getConfig(match);
  const currentGame = match.games.find((g) => !g.completedAt) ?? match.games[match.games.length - 1] ?? null;

  const gamesWon = { entry1: 0, entry2: 0 };
  for (const g of match.games) {
    if (g.winnerEntryId && g.winnerEntryId === match.entry1Id) gamesWon.entry1 += 1;
    if (g.winnerEntryId && g.winnerEntryId === match.entry2Id) gamesWon.entry2 += 1;
  }

  return {
    matchId: match.id,
    status: match.status,
    entry1Id: match.entry1Id,
    entry2Id: match.entry2Id,
    entry1: match.entry1,
    entry2: match.entry2,
    winnerEntryId: match.winnerEntryId,
    config,
    games: match.games,
    currentGame,
    gamesWon,
    isPaused: await isPaused(matchId),
  };
}

async function publish(matchId: string) {
  const state = await buildState(matchId);
  emitMatchState(matchId, state);
  return state;
}

async function getEntryPlayerUserIds(entryId: string | null): Promise<string[]> {
  if (!entryId) return [];
  const entry = await prisma.categoryEntry.findUnique({
    where: { id: entryId },
    include: { player1: { select: { userId: true } }, player2: { select: { userId: true } } },
  });
  if (!entry) return [];
  return [entry.player1.userId, entry.player2?.userId].filter((id): id is string => !!id);
}

async function notifyBothEntries(
  entry1Id: string | null,
  entry2Id: string | null,
  type: "MATCH_LIVE" | "MATCH_RESULT",
  title: string,
  body: string,
  data?: Prisma.InputJsonValue,
) {
  const userIds = [...(await getEntryPlayerUserIds(entry1Id)), ...(await getEntryPlayerUserIds(entry2Id))];
  await Promise.all(userIds.map((userId) => createNotification({ userId, type, title, body, data })));
}

export async function getState(matchId: string) {
  return buildState(matchId);
}

export async function startMatch(matchId: string) {
  const match = await getMatchWithGames(matchId);
  if (!match.entry1Id || !match.entry2Id) {
    throw new ApiError(409, "This match does not have two entries yet");
  }
  if (match.status === "LIVE") {
    throw new ApiError(409, "This match is already live");
  }
  if (match.status === "COMPLETED" || match.status === "CANCELLED") {
    throw new ApiError(409, `Cannot start a match that is ${match.status.toLowerCase()}`);
  }

  if (match.games.length === 0) {
    await prisma.matchGame.create({ data: { matchId, gameNumber: 1 } });
  }
  await prisma.match.update({ where: { id: matchId }, data: { status: "LIVE" } });

  const categoryName = match.category?.name ?? "your category";
  await notifyBothEntries(
    match.entry1Id,
    match.entry2Id,
    "MATCH_LIVE",
    "Match Live",
    `Your ${categoryName} match has started.`,
    { matchId },
  );

  return publish(matchId);
}

export async function pauseMatch(matchId: string, userId: string) {
  const match = await getMatchWithGames(matchId);
  if (match.status !== "LIVE") {
    throw new ApiError(409, "Only a live match can be paused");
  }
  if (await isPaused(matchId)) {
    throw new ApiError(409, "This match is already paused");
  }

  const currentGame = match.games.find((g) => !g.completedAt);
  await prisma.matchScoreEvent.create({
    data: {
      matchId,
      gameNumber: currentGame?.gameNumber ?? match.games.length,
      eventType: "PAUSE",
      scoreSnapshot: currentGame
        ? { entry1Score: currentGame.entry1Score, entry2Score: currentGame.entry2Score }
        : {},
      createdById: userId,
    },
  });

  return publish(matchId);
}

export async function resumeMatch(matchId: string, userId: string) {
  const match = await getMatchWithGames(matchId);
  if (!(await isPaused(matchId))) {
    throw new ApiError(409, "This match is not paused");
  }

  const currentGame = match.games.find((g) => !g.completedAt);
  await prisma.matchScoreEvent.create({
    data: {
      matchId,
      gameNumber: currentGame?.gameNumber ?? match.games.length,
      eventType: "RESUME",
      scoreSnapshot: currentGame
        ? { entry1Score: currentGame.entry1Score, entry2Score: currentGame.entry2Score }
        : {},
      createdById: userId,
    },
  });

  return publish(matchId);
}

export async function addPoint(matchId: string, entryId: string, userId: string) {
  const match = await getMatchWithGames(matchId);

  if (match.status !== "LIVE") {
    throw new ApiError(409, "This match is not live");
  }
  if (await isPaused(matchId)) {
    throw new ApiError(409, "This match is paused — resume before scoring");
  }
  if (entryId !== match.entry1Id && entryId !== match.entry2Id) {
    throw new ApiError(400, "entryId must be one of this match's two entries");
  }

  const currentGame = match.games.find((g) => !g.completedAt);
  if (!currentGame) {
    throw new ApiError(409, "There is no active game to score");
  }

  const config = getConfig(match);
  const isEntry1 = entryId === match.entry1Id;
  const entry1Score = currentGame.entry1Score + (isEntry1 ? 1 : 0);
  const entry2Score = currentGame.entry2Score + (isEntry1 ? 0 : 1);
  const outcome = evaluateGame(entry1Score, entry2Score, config);

  let completedMatchWinnerEntryId: string | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.matchGame.update({
      where: { id: currentGame.id },
      data: { entry1Score, entry2Score },
    });

    await tx.matchScoreEvent.create({
      data: {
        matchId,
        gameNumber: currentGame.gameNumber,
        eventType: "POINT",
        entryId,
        scoreSnapshot: { entry1Score, entry2Score },
        createdById: userId,
      },
    });

    if (!outcome.isOver) {
      return;
    }

    const gameWinnerEntryId = outcome.winner === "ENTRY1" ? match.entry1Id! : match.entry2Id!;
    await tx.matchGame.update({
      where: { id: currentGame.id },
      data: { winnerEntryId: gameWinnerEntryId, completedAt: new Date() },
    });
    await tx.matchScoreEvent.create({
      data: {
        matchId,
        gameNumber: currentGame.gameNumber,
        eventType: "GAME_COMPLETE",
        entryId: gameWinnerEntryId,
        scoreSnapshot: { entry1Score, entry2Score },
        createdById: userId,
      },
    });

    const allGames = await tx.matchGame.findMany({ where: { matchId } });
    let entry1Wins = 0;
    let entry2Wins = 0;
    for (const g of allGames) {
      if (g.winnerEntryId === match.entry1Id) entry1Wins += 1;
      if (g.winnerEntryId === match.entry2Id) entry2Wins += 1;
    }

    const needed = gamesToWinMatch(config.bestOf);
    if (entry1Wins < needed && entry2Wins < needed) {
      await tx.matchGame.create({ data: { matchId, gameNumber: currentGame.gameNumber + 1 } });
      return;
    }

    const matchWinnerEntryId = entry1Wins >= needed ? match.entry1Id! : match.entry2Id!;
    const loserEntryId = matchWinnerEntryId === match.entry1Id ? match.entry2Id! : match.entry1Id!;
    completedMatchWinnerEntryId = matchWinnerEntryId;

    await tx.match.update({
      where: { id: matchId },
      data: { status: "COMPLETED", winnerEntryId: matchWinnerEntryId },
    });

    if (match.nextMatchId && match.nextMatchSlot !== null) {
      await tx.match.update({
        where: { id: match.nextMatchId },
        data: match.nextMatchSlot === 0 ? { entry1Id: matchWinnerEntryId } : { entry2Id: matchWinnerEntryId },
      });
    }

    const firstEvent = await tx.matchScoreEvent.findFirst({ where: { matchId }, orderBy: { createdAt: "asc" } });
    const durationMinutes = firstEvent
      ? Math.max(1, Math.round((Date.now() - firstEvent.createdAt.getTime()) / 60000))
      : null;

    await tx.result.create({
      data: {
        matchId,
        winnerEntryId: matchWinnerEntryId,
        loserEntryId,
        gameScores: allGames.map((g) => ({
          gameNumber: g.gameNumber,
          entry1Score: g.entry1Score,
          entry2Score: g.entry2Score,
        })),
        durationMinutes,
        finalizedById: userId,
      },
    });

    await tx.matchScoreEvent.create({
      data: {
        matchId,
        gameNumber: currentGame.gameNumber,
        eventType: "MATCH_COMPLETE",
        entryId: matchWinnerEntryId,
        scoreSnapshot: { entry1Wins, entry2Wins },
        createdById: userId,
      },
    });
  });

  if (completedMatchWinnerEntryId) {
    const categoryName = match.category?.name ?? "your category";
    await notifyBothEntries(
      match.entry1Id,
      match.entry2Id,
      "MATCH_RESULT",
      "Match Result",
      `Your ${categoryName} match has finished.`,
      { matchId, winnerEntryId: completedMatchWinnerEntryId },
    );
  }

  return publish(matchId);
}

interface ActivePoint {
  gameNumber: number;
  entryId: string;
}

// Trailing UNDO events cancel out trailing POINT events one-for-one, so we
// never delete audit history — an undo just adds a new UNDO event and finds
// the most recent POINT that hasn't already been cancelled.
async function findActivePoint(matchId: string): Promise<ActivePoint | null> {
  const events = await prisma.matchScoreEvent.findMany({
    where: { matchId, eventType: { in: ["POINT", "UNDO"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let pendingUndos = 0;
  for (const event of events) {
    if (event.eventType === "UNDO") {
      pendingUndos += 1;
      continue;
    }
    if (pendingUndos > 0) {
      pendingUndos -= 1;
      continue;
    }
    return { gameNumber: event.gameNumber, entryId: event.entryId! };
  }
  return null;
}

export async function undoLastPoint(matchId: string, userId: string) {
  const match = await getMatchWithGames(matchId);
  const target = await findActivePoint(matchId);
  if (!target) {
    throw new ApiError(409, "Nothing to undo");
  }

  const game = await prisma.matchGame.findUnique({
    where: { matchId_gameNumber: { matchId, gameNumber: target.gameNumber } },
  });
  if (!game) {
    throw new ApiError(500, "Scoring data is inconsistent — game not found for undo target");
  }

  const isEntry1 = target.entryId === match.entry1Id;
  const entry1Score = game.entry1Score - (isEntry1 ? 1 : 0);
  const entry2Score = game.entry2Score - (isEntry1 ? 0 : 1);
  if (entry1Score < 0 || entry2Score < 0) {
    throw new ApiError(500, "Scoring data is inconsistent — cannot undo below zero");
  }

  const wasGameCompleted = game.completedAt !== null;
  const wasMatchCompleted = match.status === "COMPLETED";

  await prisma.$transaction(async (tx) => {
    if (wasMatchCompleted) {
      if (match.nextMatchId) {
        const nextMatch = await tx.match.findUnique({ where: { id: match.nextMatchId } });
        if (nextMatch && (nextMatch.status === "LIVE" || nextMatch.status === "COMPLETED")) {
          throw new ApiError(409, "Cannot undo: the next match has already started");
        }
        if (nextMatch && match.nextMatchSlot !== null) {
          await tx.match.update({
            where: { id: match.nextMatchId },
            data: match.nextMatchSlot === 0 ? { entry1Id: null } : { entry2Id: null },
          });
        }
      }
      await tx.result.deleteMany({ where: { matchId } });
      await tx.match.update({ where: { id: matchId }, data: { status: "LIVE", winnerEntryId: null } });
    }

    if (wasGameCompleted) {
      const nextGame = await tx.matchGame.findUnique({
        where: { matchId_gameNumber: { matchId, gameNumber: target.gameNumber + 1 } },
      });
      if (nextGame) {
        const nextGameEventCount = await tx.matchScoreEvent.count({
          where: { matchId, gameNumber: nextGame.gameNumber },
        });
        if (nextGameEventCount > 0) {
          throw new ApiError(409, "Cannot undo: the next game has already started");
        }
        await tx.matchGame.delete({ where: { id: nextGame.id } });
      }
    }

    await tx.matchGame.update({
      where: { id: game.id },
      data: {
        entry1Score,
        entry2Score,
        winnerEntryId: wasGameCompleted ? null : game.winnerEntryId,
        completedAt: wasGameCompleted ? null : game.completedAt,
      },
    });

    await tx.matchScoreEvent.create({
      data: {
        matchId,
        gameNumber: target.gameNumber,
        eventType: "UNDO",
        entryId: target.entryId,
        scoreSnapshot: { entry1Score, entry2Score },
        createdById: userId,
      },
    });
  });

  return publish(matchId);
}
