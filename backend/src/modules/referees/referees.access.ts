import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../middleware/errorHandler";
import { isTournamentAdmin } from "../tournaments/tournaments.service";
import { getReferee } from "./referees.service";

// Referee contact info is treated as internal/operational data, so listing
// and creating both require tournament-administration authority.
export async function requireRefereeCreateAccess(req: Request, _res: Response, next: NextFunction) {
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
  const allowed = await isTournamentAdmin(req.params.tournamentId, req.user.sub);
  if (!allowed) {
    next(new ApiError(403, "Not an admin of this tournament"));
    return;
  }
  next();
}

export async function requireRefereeAccess(req: Request, _res: Response, next: NextFunction) {
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
  const referee = await getReferee(req.params.id);
  const allowed = await isTournamentAdmin(referee.tournamentId, req.user.sub);
  if (!allowed) {
    next(new ApiError(403, "Not an admin of this tournament"));
    return;
  }
  next();
}
