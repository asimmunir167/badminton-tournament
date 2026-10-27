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

export const autoScheduleSchema = z.object({
  categoryId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "startTime must be HH:MM")
    .optional(),
  matchDurationMinutes: z.number().int().min(15).max(180).optional(),
  breakMinutes: z.number().int().min(0).max(60).optional(),
  dayEndTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "dayEndTime must be HH:MM")
    .optional(),
});

export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
export type RecordWinnerInput = z.infer<typeof recordWinnerSchema>;
export type AutoScheduleInput = z.infer<typeof autoScheduleSchema>;
