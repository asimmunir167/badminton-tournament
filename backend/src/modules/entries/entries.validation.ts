import { z } from "zod";

export const createEntrySchema = z.object({
  player1Id: z.string().uuid(),
  player2Id: z.string().uuid().optional(),
  seed: z.number().int().positive().optional(),
});

export const updateEntrySchema = z.object({
  seed: z.number().int().positive().nullable().optional(),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
