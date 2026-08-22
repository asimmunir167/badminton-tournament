import { z } from "zod";

export const createCourtSchema = z.object({
  name: z.string().min(1).max(60),
});

export const updateCourtSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  status: z.enum(["IDLE", "IN_USE", "CLOSED"]).optional(),
});

export type CreateCourtInput = z.infer<typeof createCourtSchema>;
export type UpdateCourtInput = z.infer<typeof updateCourtSchema>;
