import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { OtpPurpose } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

async function sendOtp(target: string, code: string): Promise<void> {
  if (env.OTP_PROVIDER === "console") {
    console.log(`[OTP] ${target}: ${code}`);
    return;
  }

  // Twilio credentials are validated as present by env.ts, but the SDK
  // integration itself is not wired up yet — fail loudly instead of
  // pretending an SMS was sent.
  throw new ApiError(500, "Twilio OTP provider is not implemented yet");
}

export async function requestOtp(target: string, purpose: OtpPurpose): Promise<void> {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.otpCode.create({
    data: {
      target,
      codeHash,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendOtp(target, code);
}

export async function verifyOtp(target: string, purpose: OtpPurpose, code: string): Promise<void> {
  const otp = await prisma.otpCode.findFirst({
    where: { target, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.expiresAt < new Date()) {
    throw new ApiError(400, "OTP has expired or was not requested");
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, "Too many incorrect attempts, request a new OTP");
  }

  const valid = await bcrypt.compare(code, otp.codeHash);

  if (!valid) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new ApiError(400, "Invalid OTP code");
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
}
