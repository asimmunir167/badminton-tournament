import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../middleware/errorHandler";
import { isTournamentAdmin } from "./tournaments.service";

// Allows super_admin unconditionally, or a tournament_admin who is assigned
// to the specific :id in the route. Everyone else is rejected.
export async function requireTournamentAccess(req: Request, _res: Response, next: NextFunction) {
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

  const allowed = await isTournamentAdmin(req.params.id, req.user.sub);
  if (!allowed) {
    next(new ApiError(403, "Not an admin of this tournament"));
    return;
  }
  next();
}
