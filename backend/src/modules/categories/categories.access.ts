import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../middleware/errorHandler";
import { isTournamentAdmin } from "../tournaments/tournaments.service";
import { getCategoryTournamentId } from "./categories.service";

// For routes nested under a tournament, e.g. POST /tournaments/:tournamentId/categories
export async function requireTournamentAccessForCreate(req: Request, _res: Response, next: NextFunction) {
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

// For routes addressed by category id, e.g. PATCH/DELETE /categories/:id
export async function requireCategoryAccess(req: Request, _res: Response, next: NextFunction) {
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

  const tournamentId = await getCategoryTournamentId(req.params.id);
  const allowed = await isTournamentAdmin(tournamentId, req.user.sub);
  if (!allowed) {
    next(new ApiError(403, "Not an admin of this tournament"));
    return;
  }
  next();
}

// Same rule as requireCategoryAccess, but for routes nested under
// /categories/:categoryId/... (entries, draw generation).
export async function requireCategoryTournamentAccess(req: Request, _res: Response, next: NextFunction) {
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

  const tournamentId = await getCategoryTournamentId(req.params.categoryId);
  const allowed = await isTournamentAdmin(tournamentId, req.user.sub);
  if (!allowed) {
    next(new ApiError(403, "Not an admin of this tournament"));
    return;
  }
  next();
}
