import { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { isTournamentAdmin } from "../tournaments/tournaments.service";
import { getMatch } from "./matches.service";

// Rescheduling / reassigning a match is tournament-administration authority.
export async function requireMatchAdminAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  if (req.user.role === "super_admin") {
    next();
    return;
  }
  if (req.user.role !== "tournament_admin") {
    next(new ApiError(403, "Insufficient permissions"));
    return;
  }

  const match = await getMatch(req.params.id);
  const allowed = await isTournamentAdmin(match.tournamentId, req.user.sub);
  if (!allowed) {
    next(new ApiError(403, "Not an admin of this tournament"));
    return;
  }
  next();
}

// Recording a result: super_admin, the tournament's admin, or the referee
// actually assigned to this match.
export async function requireMatchOfficiateAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  if (req.user.role === "super_admin") {
    next();
    return;
  }

  const match = await getMatch(req.params.id);

  if (req.user.role === "tournament_admin" && (await isTournamentAdmin(match.tournamentId, req.user.sub))) {
    next();
    return;
  }

  if (req.user.role === "referee" && match.refereeId) {
    const referee = await prisma.referee.findUnique({ where: { id: match.refereeId } });
    if (referee && referee.userId === req.user.sub) {
      next();
      return;
    }
  }

  next(new ApiError(403, "Insufficient permissions"));
}
