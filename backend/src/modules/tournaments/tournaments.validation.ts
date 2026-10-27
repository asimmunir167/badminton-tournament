import { z } from "zod";

const scoringConfigSchema = z
  .object({
    pointsPerGame: z.number().int().min(11).max(30),
    bestOf: z.union([z.literal(1), z.literal(3), z.literal(5)]),
    capAt: z.number().int().min(21).max(35),
  })
  .partial();

const walletAccountSchema = z.object({
  number: z.string().min(8).max(20),
  accountName: z.string().min(2).max(120),
});

const bankAccountSchema = z.object({
  bankName: z.string().min(2).max(80),
  accountTitle: z.string().min(2).max(160),
  accountNumber: z.string().min(4).max(40),
  iban: z.string().max(34).optional(),
});

export const paymentAccountsSchema = z.object({
  jazzCash: walletAccountSchema.optional(),
  easyPaisa: walletAccountSchema.optional(),
  bank: bankAccountSchema.optional(),
});

const baseFields = {
  name: z.string().min(3).max(160),
  logoUrl: z.string().url(),
  description: z.string().max(4000),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  registrationDeadline: z.coerce.date(),
  venue: z.string().min(2).max(200),
  address: z.string().max(300),
  organizer: z.string().max(200),
  contactInfo: z.string().max(200),
  rulesText: z.string().max(10000),
  paymentInstructions: z.string().max(2000),
  paymentAccounts: paymentAccountsSchema,
  maxTeams: z.number().int().positive(),
  maxPlayers: z.number().int().positive(),
  format: z.enum(["KNOCKOUT", "ROUND_ROBIN", "GROUP_KNOCKOUT"]),
  scoringConfig: scoringConfigSchema,
};

export const createTournamentSchema = z
  .object({
    name: baseFields.name,
    logoUrl: baseFields.logoUrl.optional(),
    description: baseFields.description.optional(),
    startDate: baseFields.startDate,
    endDate: baseFields.endDate,
    registrationDeadline: baseFields.registrationDeadline,
    venue: baseFields.venue,
    address: baseFields.address.optional(),
    organizer: baseFields.organizer.optional(),
    contactInfo: baseFields.contactInfo.optional(),
    rulesText: baseFields.rulesText.optional(),
    paymentInstructions: baseFields.paymentInstructions.optional(),
    paymentAccounts: baseFields.paymentAccounts.optional(),
    maxTeams: baseFields.maxTeams.optional(),
    maxPlayers: baseFields.maxPlayers.optional(),
    format: baseFields.format.default("KNOCKOUT"),
    scoringConfig: baseFields.scoringConfig.optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "endDate must be on or after startDate",
    path: ["endDate"],
  })
  .refine((v) => v.registrationDeadline <= v.startDate, {
    message: "registrationDeadline must be on or before startDate",
    path: ["registrationDeadline"],
  });

export const updateTournamentSchema = z.object({
  name: baseFields.name.optional(),
  logoUrl: baseFields.logoUrl.optional(),
  description: baseFields.description.optional(),
  startDate: baseFields.startDate.optional(),
  endDate: baseFields.endDate.optional(),
  registrationDeadline: baseFields.registrationDeadline.optional(),
  venue: baseFields.venue.optional(),
  address: baseFields.address.optional(),
  organizer: baseFields.organizer.optional(),
  contactInfo: baseFields.contactInfo.optional(),
  rulesText: baseFields.rulesText.optional(),
  paymentInstructions: baseFields.paymentInstructions.optional(),
  paymentAccounts: baseFields.paymentAccounts.nullable().optional(),
  maxTeams: baseFields.maxTeams.optional(),
  maxPlayers: baseFields.maxPlayers.optional(),
  format: baseFields.format.optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
  scoringConfig: baseFields.scoringConfig.optional(),
});

export const assignAdminSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
export type AssignAdminInput = z.infer<typeof assignAdminSchema>;
