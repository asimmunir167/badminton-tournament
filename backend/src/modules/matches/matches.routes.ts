import { Router } from "express";
import * as controller from "./matches.controller";
import { requireAuth } from "../../middleware/auth";
import { requireMatchAdminAccess, requireMatchOfficiateAccess } from "./matches.access";

// Mounted at /api/tournaments/:tournamentId/matches (needs mergeParams)
export const tournamentMatchesRouter = Router({ mergeParams: true });
tournamentMatchesRouter.get("/", controller.listForTournament);

// Mounted at /api/matches
export const matchesRouter = Router();
matchesRouter.get("/:id", controller.getOne);
matchesRouter.patch("/:id", requireAuth, requireMatchAdminAccess, controller.update);
matchesRouter.patch("/:id/winner", requireAuth, requireMatchOfficiateAccess, controller.recordWinner);
