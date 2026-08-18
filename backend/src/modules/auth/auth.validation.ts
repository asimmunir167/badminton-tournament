import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const otpRequestSchema = z.object({
  phone: z.string().min(7).max(20),
  purpose: z.enum(["LOGIN", "REGISTER"]),
});

export const otpVerifySchema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().length(6),
  purpose: z.enum(["LOGIN", "REGISTER"]),
  fullName: z.string().min(2).max(120).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
