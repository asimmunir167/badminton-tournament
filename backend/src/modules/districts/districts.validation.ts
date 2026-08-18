import { z } from "zod";

export const createDistrictSchema = z.object({
  name: z.string().min(2).max(120),
  code: z
    .string()
    .min(2)
    .max(10)
    .transform((v) => v.toUpperCase()),
  logoUrl: z.string().url().optional(),
  contactPhone: z.string().min(7).max(20).optional(),
  contactEmail: z.string().email().optional(),
});

export const updateDistrictSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  code: z
    .string()
    .min(2)
    .max(10)
    .transform((v) => v.toUpperCase())
    .optional(),
  logoUrl: z.string().url().optional(),
  contactPhone: z.string().min(7).max(20).optional(),
  contactEmail: z.string().email().optional(),
});

export type CreateDistrictInput = z.infer<typeof createDistrictSchema>;
export type UpdateDistrictInput = z.infer<typeof updateDistrictSchema>;
