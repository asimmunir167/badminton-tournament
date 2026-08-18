import { NextFunction, Request, RequestHandler, Response } from "express";
import * as authService from "./auth.service";
import { loginSchema, otpRequestSchema, otpVerifySchema, refreshSchema, registerSchema } from "./auth.validation";
import { ApiError } from "../../middleware/errorHandler";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const register = wrap(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.registerWithPassword(input, req.headers["user-agent"]);
  res.status(201).json(result);
});

export const login = wrap(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.loginWithPassword(input, req.headers["user-agent"]);
  res.status(200).json(result);
});

export const requestOtp = wrap(async (req, res) => {
  const input = otpRequestSchema.parse(req.body);
  await authService.requestOtp(input);
  res.status(200).json({ message: "OTP sent" });
});

export const verifyOtp = wrap(async (req, res) => {
  const input = otpVerifySchema.parse(req.body);
  const result = await authService.verifyOtpAndIssueTokens(input, req.headers["user-agent"]);
  res.status(200).json(result);
});

export const refresh = wrap(async (req, res) => {
  const input = refreshSchema.parse(req.body);
  const result = await authService.refreshTokens(input.refreshToken, req.headers["user-agent"]);
  res.status(200).json(result);
});

export const logout = wrap(async (req, res) => {
  const input = refreshSchema.parse(req.body);
  await authService.logout(input.refreshToken);
  res.status(204).send();
});

export const me = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const result = await authService.getMe(req.user.sub);
  res.status(200).json(result);
});
