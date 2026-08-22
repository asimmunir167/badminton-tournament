import { z } from "zod";

export const listUsersQuerySchema = z.object({
  role: z.string().optional(),
  search: z.string().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
