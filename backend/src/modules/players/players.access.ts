import { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { isDistrictManagerOf } from "../districts/districts.service";
import { getPlayer } from "./players.service";

export async function requireCreateAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  const { role, sub } = req.user;

  if (role === "super_admin" || role === "player") {
    next();
    return;
  }

  if (role === "district_manager") {
    const allowed = await isDistrictManagerOf(req.params.districtId, sub);
    if (!allowed) {
      next(new ApiError(403, "Not a manager of this district"));
      return;
    }
    next();
    return;
  }

  if (role === "team_manager") {
    const teamId = req.body?.teamId;
    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.managerUserId !== sub) {
        next(new ApiError(403, "You can only add players to your own team"));
        return;
      }
    }
    next();
    return;
  }

  next(new ApiError(403, "Insufficient permissions"));
}

// General field edits: super_admin, the player's own linked account, the
// district_manager of the player's district, or the manager of the player's team.
export async function requirePlayerEditAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  if (req.user.role === "super_admin") {
    next();
    return;
  }

  const player = await getPlayer(req.params.id);

  if (player.userId === req.user.sub) {
    next();
    return;
  }
  if (req.user.role === "district_manager" && (await isDistrictManagerOf(player.districtId, req.user.sub))) {
    next();
    return;
  }
  if (req.user.role === "team_manager" && player.teamId) {
    const team = await prisma.team.findUnique({ where: { id: player.teamId } });
    if (team && team.managerUserId === req.user.sub) {
      next();
      return;
    }
  }

  next(new ApiError(403, "Insufficient permissions"));
}

// Status changes and deletion are administrative decisions: super_admin, or
// the district_manager of the player's district.
export async function requirePlayerAdminAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  if (req.user.role === "super_admin") {
    next();
    return;
  }

  const player = await getPlayer(req.params.id);
  if (req.user.role === "district_manager" && (await isDistrictManagerOf(player.districtId, req.user.sub))) {
    next();
    return;
  }

  next(new ApiError(403, "Insufficient permissions"));
}

// idDocumentUrl is sensitive identity-document storage — only the player
// themself, their district_manager, or a super_admin may see it.
export async function canViewIdDocument(
  player: { userId: string | null; districtId: string },
  user?: { sub: string; role: string },
): Promise<boolean> {
  if (!user) {
    return false;
  }
  if (user.role === "super_admin") {
    return true;
  }
  if (player.userId === user.sub) {
    return true;
  }
  if (user.role === "district_manager") {
    return isDistrictManagerOf(player.districtId, user.sub);
  }
  return false;
}
