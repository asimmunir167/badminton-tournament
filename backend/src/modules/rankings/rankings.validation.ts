import { z } from "zod";

export const rankingsQuerySchema = z.object({
  entityType: z.enum(["PLAYER", "TEAM", "DISTRICT"]),
});

export type RankingsQuery = z.infer<typeof rankingsQuerySchema>;
