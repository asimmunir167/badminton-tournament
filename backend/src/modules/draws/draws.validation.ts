import { z } from "zod";

export const generateDrawSchema = z.object({
  format: z.enum(["KNOCKOUT", "ROUND_ROBIN", "GROUP_KNOCKOUT", "TEHSIL_KNOCKOUT"]).optional(),
});
