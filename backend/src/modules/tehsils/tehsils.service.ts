import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { defaultTehsilsForDistrict, TEHSILS_BY_DISTRICT_CODE } from "../../data/punjab-tehsils";

function tehsilNamesForDistrict(code: string, districtName: string): string[] {
  return TEHSILS_BY_DISTRICT_CODE[code] ?? defaultTehsilsForDistrict(districtName);
}

export async function seedTehsilsForDistrict(districtId: string) {
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) {
    throw new ApiError(404, "District not found");
  }

  const names = tehsilNamesForDistrict(district.code, district.name);
  await prisma.tehsil.createMany({
    data: names.map((name) => ({ districtId, name })),
    skipDuplicates: true,
  });
}

/** Fast tehsil list — uses static Punjab data, syncs to DB in background. */
export async function listTehsilsForDistrict(districtId: string) {
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) {
    throw new ApiError(404, "District not found");
  }

  const names = tehsilNamesForDistrict(district.code, district.name);

  try {
    const existing = await prisma.tehsil.findMany({
      where: { districtId },
      orderBy: { name: "asc" },
    });
    if (existing.length >= names.length) {
      return existing;
    }
    // Seed missing rows without blocking the response for long.
    void seedTehsilsForDistrict(districtId).catch(() => undefined);
    if (existing.length > 0) {
      return existing;
    }
    await seedTehsilsForDistrict(districtId);
    return prisma.tehsil.findMany({ where: { districtId }, orderBy: { name: "asc" } });
  } catch {
    // tehsils table may not exist yet — return names so UI still works
    return names.map((name) => ({ id: `pending:${name}`, name, districtId, createdAt: new Date() }));
  }
}

export async function createTehsil(districtId: string, name: string) {
  const district = await prisma.district.findUnique({ where: { id: districtId } });
  if (!district) {
    throw new ApiError(404, "District not found");
  }

  const existing = await prisma.tehsil.findFirst({ where: { districtId, name } });
  if (existing) {
    throw new ApiError(409, "A tehsil with this name already exists in this district");
  }

  return prisma.tehsil.create({ data: { districtId, name } });
}

export async function getTehsil(id: string) {
  const tehsil = await prisma.tehsil.findUnique({ where: { id } });
  if (!tehsil) {
    throw new ApiError(404, "Tehsil not found");
  }
  return tehsil;
}
