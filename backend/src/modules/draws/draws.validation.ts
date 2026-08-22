import { z } from "zod";

// GROUP_KNOCKOUT is intentionally excluded — the current schema has no
// group-stage table, so we reject it explicitly rather than fake it.
export const generateDrawSchema = z.object({
  format: z.enum(["KNOCKOUT", "ROUND_ROBIN"]).optional(),
});

export type GenerateDrawInput = z.infer<typeof generateDrawSchema>;
