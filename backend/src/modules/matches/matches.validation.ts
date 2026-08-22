import { z } from "zod";

export const updateMatchSchema = z.object({
  scheduledDate: z.coerce.date().optional(),
  scheduledTime: z.string().max(20).optional(),
  courtId: z.string().uuid().nullable().optional(),
  refereeId: z.string().uuid().nullable().optional(),
  status: z.enum(["SCHEDULED", "STARTING_SOON", "LIVE", "COMPLETED", "CANCELLED", "POSTPONED"]).optional(),
});

export const recordWinnerSchema = z.object({
  winnerEntryId: z.string().uuid(),
});

export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
export type RecordWinnerInput = z.infer<typeof recordWinnerSchema>;
