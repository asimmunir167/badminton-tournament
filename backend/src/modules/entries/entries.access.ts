import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../middleware/errorHandler";
import { getCategoryTournamentId } from "../categories/categories.service";
import { isTournamentAdmin } from "../tournaments/tournaments.service";
import { getEntry } from "./entries.service";

// For routes addressed by entry id, e.g. PATCH/DELETE /entries/:id
export async function requireEntryAccess(req: Request, _res: Response, next: NextFunction) {
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

  const entry = await getEntry(req.params.id);
  const tournamentId = await getCategoryTournamentId(entry.categoryId);
  const allowed = await isTournamentAdmin(tournamentId, req.user.sub);
  if (!allowed) {
    next(new ApiError(403, "Not an admin of this tournament"));
    return;
  }
  next();
}
