import { z } from "zod";

export const addPointSchema = z.object({
  entryId: z.string().uuid(),
});

export type AddPointInput = z.infer<typeof addPointSchema>;
