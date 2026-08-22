import { RankingEntityType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";

// Simple medal-table point values — the spec doesn't mandate numbers, so
// these are a reasonable default (gold=5, silver=3, bronze=1, else 0).
function medalPoints(rank: number): number {
  if (rank === 1) return 5;
  if (rank === 2) return 3;
  if (rank === 3) return 1;
  return 0;
}

interface EntryLike {
  id: string;
  player1Id: string;
  player2Id: string | null;
}

function playersOf(entry: EntryLike): string[] {
  return [entry.player1Id, entry.player2Id].filter((id): id is string => Boolean(id));
}

interface GameScoreEntry {
  gameNumber: number;
  entry1Score: number;
  entry2Score: number;
}

function pointDiffFromGames(gameScores: unknown, isEntry1: boolean): number {
  if (!Array.isArray(gameScores)) {
    return 0;
  }
  let diff = 0;
  for (const raw of gameScores as GameScoreEntry[]) {
    const mine = isEntry1 ? raw.entry1Score : raw.entry2Score;
    const theirs = isEntry1 ? raw.entry2Score : raw.entry1Score;
    diff += mine - theirs;
  }
  return diff;
}

interface Placement {
  entryId: string;
  rank: number;
}

// Champion + runner-up from the final; both semifinal losers share bronze
// (there's no 3rd-place playoff match in the bracket generator).
async function computeKnockoutPlacements(drawId: string): Promise<Placement[]> {
  const final = await prisma.match.findFirst({ where: { drawId }, orderBy: { round: "desc" } });
  if (!final || final.status !== "COMPLETED" || !final.winnerEntryId || !final.entry1Id || !final.entry2Id) {
    throw new ApiError(409, "The final has not been completed yet");
  }

  const champion = final.winnerEntryId;
  const runnerUp = final.entry1Id === champion ? final.entry2Id : final.entry1Id;
  const placements: Placement[] = [
    { entryId: champion, rank: 1 },
    { entryId: runnerUp, rank: 2 },
  ];

  if (final.round >= 2) {
    const semis = await prisma.match.findMany({ where: { drawId, round: final.round - 1 } });
    for (const m of semis) {
      if (!m.entry1Id || !m.entry2Id || !m.winnerEntryId || m.status !== "COMPLETED") {
        continue;
      }
      const loser = m.entry1Id === m.winnerEntryId ? m.entry2Id : m.entry1Id;
      placements.push({ entryId: loser, rank: 3 });
    }
  }

  return placements;
}

// Standings by wins, then point differential, then seed as a final
// deterministic tiebreak (not true head-to-head tie-breaking).
async function computeRoundRobinPlacements(
  drawId: string,
  entries: { id: string; seed: number | null }[],
): Promise<Placement[]> {
  const matches = await prisma.match.findMany({
    where: { drawId, status: "COMPLETED" },
    include: { result: true },
  });

  const stats = new Map<string, { wins: number; diff: number }>();
  for (const e of entries) {
    stats.set(e.id, { wins: 0, diff: 0 });
  }

  for (const m of matches) {
    if (!m.result || !m.entry1Id || !m.entry2Id) {
      continue;
    }
    const s1 = stats.get(m.entry1Id);
    const s2 = stats.get(m.entry2Id);
    if (!s1 || !s2) {
      continue;
    }

    const diff1 = pointDiffFromGames(m.result.gameScores, true);
    s1.diff += diff1;
    s2.diff -= diff1;

    if (m.result.winnerEntryId === m.entry1Id) {
      s1.wins += 1;
    } else if (m.result.winnerEntryId === m.entry2Id) {
      s2.wins += 1;
    }
  }

  return entries
    .map((e) => ({ entryId: e.id, seed: e.seed ?? Number.MAX_SAFE_INTEGER, ...stats.get(e.id)! }))
    .sort((a, b) => b.wins - a.wins || b.diff - a.diff || a.seed - b.seed)
    .map((r, i) => ({ entryId: r.entryId, rank: i + 1 }));
}

export async function computeCategoryPlacements(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const draw = await prisma.draw.findFirst({ where: { categoryId }, orderBy: { generatedAt: "desc" } });
  if (!draw) {
    throw new ApiError(400, "No draw has been generated for this category yet");
  }

  const entries = await prisma.categoryEntry.findMany({ where: { categoryId } });
  const entryById = new Map(entries.map((e) => [e.id, e]));

  const placements =
    draw.format === "ROUND_ROBIN"
      ? await computeRoundRobinPlacements(draw.id, entries)
      : await computeKnockoutPlacements(draw.id);

  const rows = placements.flatMap(({ entryId, rank }) => {
    const entry = entryById.get(entryId);
    if (!entry) {
      return [];
    }
    const points = medalPoints(rank);
    return playersOf(entry).map((playerId) => ({
      tournamentId: category.tournamentId,
      categoryId,
      entityType: RankingEntityType.PLAYER,
      entityId: playerId,
      rank,
      points,
      gold: rank === 1 ? 1 : 0,
      silver: rank === 2 ? 1 : 0,
      bronze: rank === 3 ? 1 : 0,
    }));
  });

  await prisma.$transaction([
    prisma.ranking.deleteMany({
      where: { tournamentId: category.tournamentId, categoryId, entityType: RankingEntityType.PLAYER },
    }),
    prisma.ranking.createMany({ data: rows }),
  ]);

  return listCategoryRankings(categoryId);
}

interface AggregateRow {
  entityId: string;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
}

function rollup(tournamentId: string | null, entityType: RankingEntityType, sourceRows: AggregateRow[]) {
  const totals = new Map<string, Omit<AggregateRow, "entityId">>();
  for (const row of sourceRows) {
    const t = totals.get(row.entityId) ?? { points: 0, gold: 0, silver: 0, bronze: 0 };
    t.points += row.points;
    t.gold += row.gold;
    t.silver += row.silver;
    t.bronze += row.bronze;
    totals.set(row.entityId, t);
  }

  return [...totals.entries()]
    .map(([entityId, t]) => ({ entityId, ...t }))
    .sort((a, b) => b.points - a.points || b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze)
    .map((r, i) => ({
      tournamentId,
      categoryId: null,
      entityType,
      entityId: r.entityId,
      rank: i + 1,
      points: r.points,
      gold: r.gold,
      silver: r.silver,
      bronze: r.bronze,
    }));
}

function rowsByPlayerAttribute(
  categoryRows: AggregateRow[],
  playerInfo: Map<string, { teamId: string | null; districtId: string | null }>,
  attr: "teamId" | "districtId",
): AggregateRow[] {
  const out: AggregateRow[] = [];
  for (const row of categoryRows) {
    const value = playerInfo.get(row.entityId)?.[attr];
    if (value) {
      out.push({ entityId: value, points: row.points, gold: row.gold, silver: row.silver, bronze: row.bronze });
    }
  }
  return out;
}

async function loadPlayerInfo(categoryRows: AggregateRow[]) {
  const playerIds = [...new Set(categoryRows.map((r) => r.entityId))];
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, teamId: true, districtId: true },
  });
  return new Map(players.map((p) => [p.id, p]));
}

export async function computeTournamentRollup(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  const categoryRows = await prisma.ranking.findMany({
    where: { tournamentId, categoryId: { not: null }, entityType: RankingEntityType.PLAYER },
  });
  if (categoryRows.length === 0) {
    throw new ApiError(400, "No category rankings have been computed yet for this tournament");
  }

  const playerInfo = await loadPlayerInfo(categoryRows);
  const playerRollup = rollup(tournamentId, RankingEntityType.PLAYER, categoryRows);
  const teamRollup = rollup(
    tournamentId,
    RankingEntityType.TEAM,
    rowsByPlayerAttribute(categoryRows, playerInfo, "teamId"),
  );
  const districtRollup = rollup(
    tournamentId,
    RankingEntityType.DISTRICT,
    rowsByPlayerAttribute(categoryRows, playerInfo, "districtId"),
  );

  await prisma.$transaction([
    prisma.ranking.deleteMany({
      where: {
        tournamentId,
        categoryId: null,
        entityType: { in: [RankingEntityType.PLAYER, RankingEntityType.TEAM, RankingEntityType.DISTRICT] },
      },
    }),
    prisma.ranking.createMany({ data: [...playerRollup, ...teamRollup, ...districtRollup] }),
  ]);

  return { player: playerRollup, team: teamRollup, district: districtRollup };
}

export async function computeAllTimeRollup() {
  const categoryRows = await prisma.ranking.findMany({
    where: { categoryId: { not: null }, entityType: RankingEntityType.PLAYER },
  });
  if (categoryRows.length === 0) {
    throw new ApiError(400, "No category rankings have been computed yet");
  }

  const playerInfo = await loadPlayerInfo(categoryRows);
  const playerRollup = rollup(null, RankingEntityType.PLAYER, categoryRows);
  const teamRollup = rollup(null, RankingEntityType.TEAM, rowsByPlayerAttribute(categoryRows, playerInfo, "teamId"));
  const districtRollup = rollup(
    null,
    RankingEntityType.DISTRICT,
    rowsByPlayerAttribute(categoryRows, playerInfo, "districtId"),
  );

  await prisma.$transaction([
    prisma.ranking.deleteMany({
      where: {
        tournamentId: null,
        categoryId: null,
        entityType: { in: [RankingEntityType.PLAYER, RankingEntityType.TEAM, RankingEntityType.DISTRICT] },
      },
    }),
    prisma.ranking.createMany({ data: [...playerRollup, ...teamRollup, ...districtRollup] }),
  ]);

  return { player: playerRollup, team: teamRollup, district: districtRollup };
}

async function attachEntityInfo<T extends { entityId: string }>(rows: T[], entityType: RankingEntityType) {
  const ids = rows.map((r) => r.entityId);
  if (ids.length === 0) {
    return rows.map((r) => ({ ...r, entity: null }));
  }

  if (entityType === RankingEntityType.PLAYER) {
    const players = await prisma.player.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true, districtId: true, teamId: true, photoUrl: true },
    });
    const map = new Map(players.map((p) => [p.id, p]));
    return rows.map((r) => ({ ...r, entity: map.get(r.entityId) ?? null }));
  }
  if (entityType === RankingEntityType.TEAM) {
    const teams = await prisma.team.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, districtId: true, logoUrl: true },
    });
    const map = new Map(teams.map((t) => [t.id, t]));
    return rows.map((r) => ({ ...r, entity: map.get(r.entityId) ?? null }));
  }
  const districts = await prisma.district.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, code: true, logoUrl: true },
  });
  const map = new Map(districts.map((d) => [d.id, d]));
  return rows.map((r) => ({ ...r, entity: map.get(r.entityId) ?? null }));
}

export async function listCategoryRankings(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  const rows = await prisma.ranking.findMany({
    where: { categoryId, entityType: RankingEntityType.PLAYER },
    orderBy: { rank: "asc" },
  });
  return attachEntityInfo(rows, RankingEntityType.PLAYER);
}

export async function listTournamentRankings(tournamentId: string, entityType: RankingEntityType) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }
  const rows = await prisma.ranking.findMany({
    where: { tournamentId, categoryId: null, entityType },
    orderBy: { rank: "asc" },
  });
  return attachEntityInfo(rows, entityType);
}

export async function listAllTimeRankings(entityType: RankingEntityType) {
  const rows = await prisma.ranking.findMany({
    where: { tournamentId: null, categoryId: null, entityType },
    orderBy: { rank: "asc" },
  });
  return attachEntityInfo(rows, entityType);
}
