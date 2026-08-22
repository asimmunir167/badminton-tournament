import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(2).max(160),
  districtId: z.string().uuid(),
  logoUrl: z.string().url().optional(),
  managerPhone: z.string().min(7).max(20).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  logoUrl: z.string().url().optional(),
  managerPhone: z.string().min(7).max(20).optional(),
});

export const updateTeamStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"]),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type UpdateTeamStatusInput = z.infer<typeof updateTeamStatusSchema>;
