import { z } from "zod";

const playingLevelEnum = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
const categoryTypeEnum = z.enum(["SINGLES", "DOUBLES"]);
const categoryGenderEnum = z.enum(["MEN", "WOMEN", "MIXED"]);
const cnicSchema = z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "CNIC must be in the format 12345-1234567-1");

export const createPlayerSchema = z.object({
  fullName: z.string().min(2).max(160),
  fatherName: z.string().max(160).optional(),
  dob: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE"]),
  cnic: cnicSchema,
  photoUrl: z.string().url().optional(),
  phone: z.string().min(7).max(20).optional(),
  teamId: z.string().uuid().optional(),
  tehsilId: z.string().uuid().optional(),
  tehsilName: z.string().min(2).max(120).optional(),
  idDocumentUrl: z.string().url().optional(),
  playingLevel: playingLevelEnum.optional(),
  preferredCategoryType: categoryTypeEnum.optional(),
  preferredCategoryGender: categoryGenderEnum.optional(),
}).refine((data) => data.tehsilId || data.tehsilName, {
  message: "Tehsil is required",
  path: ["tehsilId"],
});

export const updatePlayerSchema = z.object({
  fullName: z.string().min(2).max(160).optional(),
  fatherName: z.string().max(160).optional(),
  dob: z.coerce.date().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  cnic: cnicSchema.optional(),
  photoUrl: z.string().url().optional(),
  phone: z.string().min(7).max(20).optional(),
  teamId: z.string().uuid().nullable().optional(),
  tehsilId: z.string().uuid().optional(),
  idDocumentUrl: z.string().url().optional(),
  playingLevel: playingLevelEnum.optional(),
  preferredCategoryType: categoryTypeEnum.optional(),
  preferredCategoryGender: categoryGenderEnum.optional(),
});

export const searchPlayersQuerySchema = z.object({
  districtId: z.string().uuid().optional(),
  categoryGender: categoryGenderEnum.optional(),
  search: z.string().max(100).optional(),
});

export const updatePlayerStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INJURED", "WITHDRAWN", "SUSPENDED"]),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
export type UpdatePlayerStatusInput = z.infer<typeof updatePlayerStatusSchema>;
export type SearchPlayersQuery = z.infer<typeof searchPlayersQuerySchema>;
