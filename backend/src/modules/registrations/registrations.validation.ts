import { z } from "zod";

const paymentMethodEnum = z.enum(["MANUAL", "JAZZCASH", "EASYPAISA", "STRIPE", "BANK_TRANSFER"]);

export const createRegistrationSchema = z.object({
  playerId: z.string().uuid(),
  categoryId: z.string().uuid(),
  partnerPlayerId: z.string().uuid().optional(), // required for doubles categories, unless pairId is given
  pairId: z.string().uuid().optional(), // apply using an existing confirmed Pair instead
  amount: z.number().positive().optional(),
  method: paymentMethodEnum.optional(),
});

export const updateRegistrationStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const listRegistrationsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  method: paymentMethodEnum.optional(),
});

export const updatePaymentSchema = z.object({
  status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]),
  transactionRef: z.string().max(120).optional(),
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
export type UpdateRegistrationStatusInput = z.infer<typeof updateRegistrationStatusSchema>;
export type ListRegistrationsQuery = z.infer<typeof listRegistrationsQuerySchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
