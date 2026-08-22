import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import type { CreateEntryInput, UpdateEntryInput } from "./entries.validation";

export async function listEntriesForCategory(categoryId: string) {
  return prisma.categoryEntry.findMany({
    where: { categoryId },
    orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
    include: { player1: true, player2: true },
  });
}

export async function getEntry(id: string) {
  const entry = await prisma.categoryEntry.findUnique({ where: { id } });
  if (!entry) {
    throw new ApiError(404, "Entry not found");
  }
  return entry;
}

async function assertPlayerExists(playerId: string) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new ApiError(404, `Player ${playerId} not found`);
  }
  return player;
}

export async function createEntry(categoryId: string, input: CreateEntryInput) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const isDoubles = category.type === "DOUBLES";
  if (isDoubles && !input.player2Id) {
    throw new ApiError(400, "This category is doubles — player2Id is required");
  }
  if (!isDoubles && input.player2Id) {
    throw new ApiError(400, "This category is singles — player2Id must not be provided");
  }
  if (input.player2Id && input.player2Id === input.player1Id) {
    throw new ApiError(400, "player1Id and player2Id must be different players");
  }

  await assertPlayerExists(input.player1Id);
  if (input.player2Id) {
    await assertPlayerExists(input.player2Id);
  }

  const duplicate = await prisma.categoryEntry.findFirst({
    where: { categoryId, player1Id: input.player1Id, player2Id: input.player2Id ?? null },
  });
  if (duplicate) {
    throw new ApiError(409, "This player (or pairing) is already entered in this category");
  }

  if (category.maxEntries) {
    const count = await prisma.categoryEntry.count({ where: { categoryId } });
    if (count >= category.maxEntries) {
      throw new ApiError(409, "This category has reached its maximum number of entries");
    }
  }

  return prisma.categoryEntry.create({ data: { categoryId, ...input } });
}

export async function updateEntry(id: string, input: UpdateEntryInput) {
  await getEntry(id);
  return prisma.categoryEntry.update({ where: { id }, data: input });
}

export async function deleteEntry(id: string) {
  const entry = await getEntry(id);
  const matchCount = await prisma.match.count({ where: { OR: [{ entry1Id: id }, { entry2Id: entry.id }] } });
  if (matchCount > 0) {
    throw new ApiError(409, "Cannot remove an entry that already appears in a generated draw");
  }
  await prisma.categoryEntry.delete({ where: { id } });
}
