import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../middleware/errorHandler";
import { isTournamentAdmin } from "../tournaments/tournaments.service";
import { getCourt } from "./courts.service";

export async function requireCourtCreateAccess(req: Request, _res: Response, next: NextFunction) {
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

export async function requireCourtAccess(req: Request, _res: Response, next: NextFunction) {
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
  const court = await getCourt(req.params.id);
  const allowed = await isTournamentAdmin(court.tournamentId, req.user.sub);
  if (!allowed) {
    next(new ApiError(403, "Not an admin of this tournament"));
    return;
  }
  next();
}
