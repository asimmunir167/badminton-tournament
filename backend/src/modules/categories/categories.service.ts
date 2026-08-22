import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.validation";

export async function listCategoriesForTournament(tournamentId: string) {
  return prisma.category.findMany({ where: { tournamentId }, orderBy: { name: "asc" } });
}

export async function getCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  return category;
}

export async function getCategoryTournamentId(id: string): Promise<string> {
  const category = await getCategory(id);
  return category.tournamentId;
}

export async function createCategory(tournamentId: string, input: CreateCategoryInput) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  const existing = await prisma.category.findFirst({ where: { tournamentId, name: input.name } });
  if (existing) {
    throw new ApiError(409, "A category with this name already exists in this tournament");
  }

  return prisma.category.create({ data: { ...input, tournamentId } });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const category = await getCategory(id);

  if (input.name) {
    const conflict = await prisma.category.findFirst({
      where: { tournamentId: category.tournamentId, name: input.name, id: { not: id } },
    });
    if (conflict) {
      throw new ApiError(409, "A category with this name already exists in this tournament");
    }
  }

  return prisma.category.update({ where: { id }, data: input });
}

export async function deleteCategory(id: string) {
  await getCategory(id);
  const entryCount = await prisma.categoryEntry.count({ where: { categoryId: id } });
  if (entryCount > 0) {
    throw new ApiError(409, "Cannot delete a category that already has entries");
  }
  await prisma.category.delete({ where: { id } });
}
