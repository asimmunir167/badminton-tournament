import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["SINGLES", "DOUBLES"]),
  gender: z.enum(["MEN", "WOMEN", "MIXED"]),
  ageGroup: z.string().max(40).optional(),
  maxEntries: z.number().int().positive().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  type: z.enum(["SINGLES", "DOUBLES"]).optional(),
  gender: z.enum(["MEN", "WOMEN", "MIXED"]).optional(),
  ageGroup: z.string().max(40).optional(),
  maxEntries: z.number().int().positive().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
