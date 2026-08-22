import crypto from "node:crypto";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { planKnockoutBracket, planRoundRobin } from "./bracket";
import type { GenerateDrawInput } from "./draws.validation";

export async function getCurrentDraw(categoryId: string) {
  const draw = await prisma.draw.findFirst({
    where: { categoryId },
    orderBy: { generatedAt: "desc" },
    include: {
      matches: {
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
        include: { entry1: true, entry2: true, winnerEntry: true },
      },
    },
  });
  if (!draw) {
    throw new ApiError(404, "No draw has been generated for this category yet");
  }
  return draw;
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

  const entries = await prisma.categoryEntry.findMany({ where: { categoryId } });
  if (entries.length < 2) {
    throw new ApiError(400, "At least 2 entries are required to generate a draw");
  }

  const format = input.format ?? category.tournament.format;
  if (format === "GROUP_KNOCKOUT") {
    throw new ApiError(400, "Group + Knockout draws are not supported yet");
  }

  const makeId = () => crypto.randomUUID();
  const plan = format === "ROUND_ROBIN" ? planRoundRobin(entries, makeId) : planKnockoutBracket(entries, makeId);

  return prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.draw.delete({ where: { id: existing.id } });
    }

    const draw = await tx.draw.create({ data: { categoryId, format, generatedById } });

    await tx.match.createMany({
      data: plan.map((m) => ({
        id: m.id,
        tournamentId: category.tournamentId,
        categoryId,
        drawId: draw.id,
        round: m.round,
        matchNumber: m.matchNumber,
        entry1Id: m.entry1Id,
        entry2Id: m.entry2Id,
        status: m.status,
        winnerEntryId: m.winnerEntryId,
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

    return tx.draw.findUniqueOrThrow({
      where: { id: draw.id },
      include: { matches: { orderBy: [{ round: "asc" }, { matchNumber: "asc" }] } },
    });
  });
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
