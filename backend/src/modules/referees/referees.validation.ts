import { z } from "zod";

export const createRefereeSchema = z.object({
  userId: z.string().uuid(),
  certificationLevel: z.string().max(60).optional(),
});

export const updateRefereeSchema = z.object({
  certificationLevel: z.string().max(60).nullable().optional(),
});

export type CreateRefereeInput = z.infer<typeof createRefereeSchema>;
export type UpdateRefereeInput = z.infer<typeof updateRefereeSchema>;
