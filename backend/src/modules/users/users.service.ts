import { prisma } from "../../lib/prisma";
import type { ListUsersQuery } from "./users.validation";

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  status: true,
  role: { select: { name: true } },
} as const;

export async function listUsers(query: ListUsersQuery) {
  const users = await prisma.user.findMany({
    where: {
      ...(query.role ? { role: { name: query.role } } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: USER_SELECT,
    orderBy: { fullName: "asc" },
    take: 50,
  });

  return users.map((u) => ({ ...u, role: u.role.name }));
}
