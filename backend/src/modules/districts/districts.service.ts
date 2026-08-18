import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import type { CreateDistrictInput, UpdateDistrictInput } from "./districts.validation";

export async function listDistricts() {
  return prisma.district.findMany({ orderBy: { name: "asc" } });
}

export async function getDistrict(id: string) {
  const district = await prisma.district.findUnique({ where: { id } });
  if (!district) {
    throw new ApiError(404, "District not found");
  }
  return district;
}

export async function createDistrict(input: CreateDistrictInput) {
  const existing = await prisma.district.findFirst({
    where: { OR: [{ name: input.name }, { code: input.code }] },
  });
  if (existing) {
    throw new ApiError(409, "A district with this name or code already exists");
  }
  return prisma.district.create({ data: input });
}

export async function updateDistrict(id: string, input: UpdateDistrictInput) {
  await getDistrict(id);

  if (input.name || input.code) {
    const conflict = await prisma.district.findFirst({
      where: {
        id: { not: id },
        OR: [...(input.name ? [{ name: input.name }] : []), ...(input.code ? [{ code: input.code }] : [])],
      },
    });
    if (conflict) {
      throw new ApiError(409, "A district with this name or code already exists");
    }
  }

  return prisma.district.update({ where: { id }, data: input });
}

export async function deleteDistrict(id: string) {
  await getDistrict(id);
  const teamCount = await prisma.team.count({ where: { districtId: id } });
  if (teamCount > 0) {
    throw new ApiError(409, "Cannot delete a district that has registered teams");
  }
  await prisma.district.delete({ where: { id } });
}
