import crypto from "node:crypto";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import {
  KO_ROUND_BASE,
  planGroupStage,
  planKnockoutBracket,
  planRoundRobin,
  planTehsilKnockoutStage,
  remapKnockoutRounds,
  type TehsilSeedableEntry,
} from "./bracket";
import type { GenerateDrawInput } from "./draws.validation";

const PLAYER_SELECT = { select: { id: true, fullName: true } } as const;
const ENTRY_INCLUDE = {
  include: {
    player1: PLAYER_SELECT,
    player2: PLAYER_SELECT,
  },
} as const;

const DRAW_MATCH_INCLUDE = {
  orderBy: [{ round: "asc" as const }, { matchNumber: "asc" as const }],
  include: {
    entry1: ENTRY_INCLUDE,
    entry2: ENTRY_INCLUDE,
    winnerEntry: ENTRY_INCLUDE,
  },
};

export async function getCurrentDraw(categoryId: string) {
  const draw = await prisma.draw.findFirst({
    where: { categoryId },
    orderBy: { generatedAt: "desc" },
    include: {
      matches: DRAW_MATCH_INCLUDE,
    },
  });
  if (!draw) {
    throw new ApiError(404, "No draw has been generated for this category yet");
  }
  return draw;
}

async function createMatchesFromPlan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  category: { id: string; tournamentId: string },
  drawId: string,
  plan: ReturnType<typeof planKnockoutBracket>,
) {
  await tx.match.createMany({
    data: plan.map((m) => ({
      id: m.id,
      tournamentId: category.tournamentId,
      categoryId: category.id,
      drawId,
      round: m.round,
      matchNumber: m.matchNumber,
      entry1Id: m.entry1Id,
      entry2Id: m.entry2Id,
      status: m.status,
      winnerEntryId: m.winnerEntryId,
      tehsilId: m.tehsilId ?? null,
    })),
  });

  const withNext = plan.filter((m) => m.nextMatchId);
  await Promise.all(
    withNext.map((m) =>
      tx.match.update({
        where: { id: m.id },
        data: { nextMatchId: m.nextMatchId, nextMatchSlot: m.nextMatchSlot },
      }),
    ),
  );
}

export async function generateDraw(categoryId: string, input: GenerateDrawInput, generatedById: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { tournament: true },
  });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const existing = await prisma.draw.findFirst({ where: { categoryId }, orderBy: { generatedAt: "desc" } });
  if (existing?.isLocked) {
    throw new ApiError(409, "The draw for this category is locked and cannot be regenerated");
  }

  const entries = await prisma.categoryEntry.findMany({
    where: { categoryId },
    include: { player1: { select: { tehsilId: true } } },
  });
  if (entries.length < 2) {
    throw new ApiError(400, "At least 2 entries are required to generate a draw");
  }

  const format = input.format ?? category.tournament.format;
  const makeId = () => crypto.randomUUID();

  let plan;
  if (format === "TEHSIL_KNOCKOUT") {
    const missingTehsil = entries.filter((e) => !e.player1.tehsilId);
    if (missingTehsil.length > 0) {
      throw new ApiError(
        400,
        "All players must have a tehsil on their profile before generating a tehsil-wise draw",
      );
    }
    const tehsilEntries: TehsilSeedableEntry[] = entries.map((e) => ({
      id: e.id,
      seed: e.seed,
      createdAt: e.createdAt,
      tehsilId: e.player1.tehsilId!,
    }));
    plan = planTehsilKnockoutStage(tehsilEntries, makeId);
  } else if (format === "GROUP_KNOCKOUT") {
    plan = planGroupStage(entries, makeId);
  } else if (format === "ROUND_ROBIN") {
    plan = planRoundRobin(entries, makeId);
  } else {
    plan = planKnockoutBracket(entries, makeId);
  }

  return prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.draw.delete({ where: { id: existing.id } });
    }

    const draw = await tx.draw.create({ data: { categoryId, format, generatedById } });
    await createMatchesFromPlan(tx, category, draw.id, plan);

    return tx.draw.findUniqueOrThrow({
      where: { id: draw.id },
      include: { matches: DRAW_MATCH_INCLUDE },
    });
  });
}

/** After group-stage matches complete, seed a knockout from top 2 of each group. */
export async function advanceGroupKnockout(categoryId: string) {
  const draw = await prisma.draw.findFirst({ where: { categoryId }, orderBy: { generatedAt: "desc" } });
  if (!draw) {
    throw new ApiError(404, "No draw has been generated for this category yet");
  }
  if (draw.format !== "GROUP_KNOCKOUT") {
    throw new ApiError(400, "Advance is only available for Group + Knockout draws");
  }
  if (draw.isLocked) {
    throw new ApiError(409, "Draw is locked");
  }

  const groupMatches = await prisma.match.findMany({
    where: { drawId: draw.id, round: { lt: KO_ROUND_BASE } },
    include: { result: true },
  });
  if (groupMatches.length === 0) {
    throw new ApiError(400, "No group-stage matches found");
  }
  if (groupMatches.some((m) => m.status !== "COMPLETED")) {
    throw new ApiError(409, "All group-stage matches must be completed before advancing");
  }

  const existingKo = await prisma.match.count({ where: { drawId: draw.id, round: { gte: KO_ROUND_BASE } } });
  if (existingKo > 0) {
    throw new ApiError(409, "Knockout stage already exists for this draw");
  }

  const groupNumbers = [...new Set(groupMatches.map((m) => m.round))].sort((a, b) => a - b);
  const qualifiers: { id: string; seed: number | null; createdAt: Date }[] = [];

  for (const group of groupNumbers) {
    const gm = groupMatches.filter((m) => m.round === group);
    const entryIds = new Set<string>();
    for (const m of gm) {
      if (m.entry1Id) entryIds.add(m.entry1Id);
      if (m.entry2Id) entryIds.add(m.entry2Id);
    }

    const stats = new Map<string, { wins: number }>();
    for (const id of entryIds) stats.set(id, { wins: 0 });
    for (const m of gm) {
      if (!m.result?.winnerEntryId) continue;
      const s = stats.get(m.result.winnerEntryId);
      if (s) s.wins += 1;
    }

    const ranked = [...stats.entries()]
      .sort((a, b) => b[1].wins - a[1].wins)
      .map(([id]) => id);

    const top = ranked.slice(0, Math.min(2, ranked.length));
    for (let i = 0; i < top.length; i += 1) {
      qualifiers.push({
        id: top[i],
        seed: group * 10 + i + 1,
        createdAt: new Date(),
      });
    }
  }

  if (qualifiers.length < 2) {
    throw new ApiError(400, "Not enough group qualifiers to build a knockout");
  }

  const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
  const makeId = () => crypto.randomUUID();
  const plan = remapKnockoutRounds(planKnockoutBracket(qualifiers, makeId), KO_ROUND_BASE);

  await prisma.$transaction(async (tx) => {
    await createMatchesFromPlan(tx, category, draw.id, plan);
  });

  return getCurrentDraw(categoryId);
}

/** After all tehsil knockouts complete, tehsil champions play district knockout. */
export async function advanceTehsilKnockout(categoryId: string) {
  const draw = await prisma.draw.findFirst({ where: { categoryId }, orderBy: { generatedAt: "desc" } });
  if (!draw) {
    throw new ApiError(404, "No draw has been generated for this category yet");
  }
  if (draw.format !== "TEHSIL_KNOCKOUT") {
    throw new ApiError(400, "Advance is only available for Tehsil + Knockout draws");
  }
  if (draw.isLocked) {
    throw new ApiError(409, "Draw is locked");
  }

  const tehsilMatches = await prisma.match.findMany({
    where: { drawId: draw.id, tehsilId: { not: null }, round: { lt: KO_ROUND_BASE } },
    include: { result: true },
  });
  if (tehsilMatches.length === 0) {
    throw new ApiError(400, "No tehsil-stage matches found");
  }
  if (tehsilMatches.some((m) => m.status !== "COMPLETED")) {
    throw new ApiError(409, "All tehsil matches must be completed before advancing to district knockout");
  }

  const existingKo = await prisma.match.count({ where: { drawId: draw.id, round: { gte: KO_ROUND_BASE } } });
  if (existingKo > 0) {
    throw new ApiError(409, "District knockout stage already exists for this draw");
  }

  const entries = await prisma.categoryEntry.findMany({
    where: { categoryId },
    include: { player1: { select: { tehsilId: true } } },
  });

  const byTehsil = new Map<string, string[]>();
  for (const e of entries) {
    const tid = e.player1.tehsilId;
    if (!tid) continue;
    const list = byTehsil.get(tid) ?? [];
    list.push(e.id);
    byTehsil.set(tid, list);
  }

  const qualifiers: { id: string; seed: number | null; createdAt: Date }[] = [];
  let seed = 1;

  for (const [tehsilId, entryIds] of byTehsil) {
    if (entryIds.length === 1) {
      qualifiers.push({ id: entryIds[0], seed: seed++, createdAt: new Date() });
      continue;
    }

    const tm = tehsilMatches.filter((m) => m.tehsilId === tehsilId);
    const final = tm.reduce((best, m) => (m.round > best.round ? m : best), tm[0]);
    if (!final?.winnerEntryId) {
      throw new ApiError(409, "Could not determine tehsil champion — complete all tehsil finals first");
    }
    qualifiers.push({ id: final.winnerEntryId, seed: seed++, createdAt: new Date() });
  }

  if (qualifiers.length < 2) {
    throw new ApiError(400, "Need at least 2 tehsil champions for district knockout");
  }

  const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
  const makeId = () => crypto.randomUUID();
  const plan = remapKnockoutRounds(planKnockoutBracket(qualifiers, makeId), KO_ROUND_BASE);

  await prisma.$transaction(async (tx) => {
    await createMatchesFromPlan(tx, category, draw.id, plan);
  });

  return getCurrentDraw(categoryId);
}

export async function lockDraw(categoryId: string) {
  const draw = await prisma.draw.findFirst({ where: { categoryId }, orderBy: { generatedAt: "desc" } });
  if (!draw) {
    throw new ApiError(404, "No draw has been generated for this category yet");
  }
  return prisma.draw.update({ where: { id: draw.id }, data: { isLocked: true } });
}

export async function unlockDraw(categoryId: string) {
  const draw = await prisma.draw.findFirst({ where: { categoryId }, orderBy: { generatedAt: "desc" } });
  if (!draw) {
    throw new ApiError(404, "No draw has been generated for this category yet");
  }
  return prisma.draw.update({ where: { id: draw.id }, data: { isLocked: false } });
}
