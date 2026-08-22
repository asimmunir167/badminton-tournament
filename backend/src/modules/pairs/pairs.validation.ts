import { z } from "zod";

export const createPairSchema = z.object({
  partnerPlayerId: z.string().uuid(),
});

export type CreatePairInput = z.infer<typeof createPairSchema>;
