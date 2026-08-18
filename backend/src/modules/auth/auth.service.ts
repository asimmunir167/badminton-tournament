import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { OtpPurpose, User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt";
import { requestOtp as sendOtpRequest, verifyOtp } from "./otp.service";
import type { LoginInput, OtpRequestInput, OtpVerifyInput, RegisterInput } from "./auth.validation";

const DEFAULT_SELF_SIGNUP_ROLE = "player";

type UserWithRole = User & { role: { id: string; name: string } };

export interface AuthResult {
  user: UserSummary;
  accessToken: string;
  refreshToken: string;
}

export interface UserSummary {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
}

function toSummary(user: UserWithRole): UserSummary {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role.name,
    status: user.status,
  };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getDefaultRole() {
  const role = await prisma.role.findUnique({ where: { name: DEFAULT_SELF_SIGNUP_ROLE } });
  if (!role) {
    throw new ApiError(500, `Role "${DEFAULT_SELF_SIGNUP_ROLE}" is not seeded — run the db:seed script`);
  }
  return role;
}

async function issueTokens(user: UserWithRole, deviceInfo?: string): Promise<AuthResult> {
  const accessToken = signAccessToken({ sub: user.id, roleId: user.roleId, role: user.role.name });
  const refreshToken = signRefreshToken(user.id);

  const decoded = verifyRefreshToken(refreshToken);
  const exp = (decoded as unknown as { exp: number }).exp;

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      deviceInfo,
      expiresAt: new Date(exp * 1000),
    },
  });

  return { user: toSummary(user), accessToken, refreshToken };
}

async function audit(userId: string | null, action: string) {
  await prisma.auditLog.create({
    data: { userId, action, entityType: "User", entityId: userId ?? "unknown" },
  });
}

export async function registerWithPassword(input: RegisterInput, deviceInfo?: string): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const role = await getDefaultRole();
  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      roleId: role.id,
      status: "ACTIVE",
    },
    include: { role: true },
  });

  await audit(user.id, "REGISTER");
  return issueTokens(user, deviceInfo);
}

export async function loginWithPassword(input: LoginInput, deviceInfo?: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { role: true } });
  if (!user || !user.passwordHash) {
    throw new ApiError(401, "Invalid email or password");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(403, `Account is ${user.status.toLowerCase()}`);
  }

  await audit(user.id, "LOGIN");
  return issueTokens(user, deviceInfo);
}

export async function requestOtp(input: OtpRequestInput): Promise<void> {
  const purpose = input.purpose as OtpPurpose;

  if (purpose === "LOGIN") {
    const user = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (!user) {
      throw new ApiError(404, "No account found for this phone number");
    }
  } else {
    const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing) {
      throw new ApiError(409, "An account with this phone number already exists");
    }
  }

  await sendOtpRequest(input.phone, purpose);
}

export async function verifyOtpAndIssueTokens(input: OtpVerifyInput, deviceInfo?: string): Promise<AuthResult> {
  const purpose = input.purpose as OtpPurpose;
  await verifyOtp(input.phone, purpose, input.code);

  if (purpose === "REGISTER") {
    if (!input.fullName) {
      throw new ApiError(400, "fullName is required to complete registration");
    }

    const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing) {
      throw new ApiError(409, "An account with this phone number already exists");
    }

    const role = await getDefaultRole();
    const user = await prisma.user.create({
      data: { fullName: input.fullName, phone: input.phone, roleId: role.id, status: "ACTIVE" },
      include: { role: true },
    });

    await audit(user.id, "REGISTER");
    return issueTokens(user, deviceInfo);
  }

  const user = await prisma.user.findUnique({ where: { phone: input.phone }, include: { role: true } });
  if (!user) {
    throw new ApiError(404, "No account found for this phone number");
  }

  await audit(user.id, "LOGIN");
  return issueTokens(user, deviceInfo);
}

export async function refreshTokens(refreshToken: string, deviceInfo?: string): Promise<AuthResult> {
  let decoded: { sub: string };
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.userId !== decoded.sub) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub }, include: { role: true } });
  if (!user || user.status !== "ACTIVE") {
    throw new ApiError(401, "Account is not active");
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return issueTokens(user, deviceInfo);
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string): Promise<UserSummary> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return toSummary(user);
}
