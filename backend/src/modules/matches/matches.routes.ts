import { Router } from "express";
import * as controller from "./matches.controller";
import { requireAuth } from "../../middleware/auth";
import {
  requireMatchAdminAccess,
  requireMatchOfficiateAccess,
  requireTournamentMatchesAdminAccess,
} from "./matches.access";

// Mounted at /api/tournaments/:tournamentId/matches (needs mergeParams)
export const tournamentMatchesRouter = Router({ mergeParams: true });
tournamentMatchesRouter.get("/", controller.listForTournament);
tournamentMatchesRouter.post(
  "/auto-schedule",
  requireAuth,
  requireTournamentMatchesAdminAccess,
  controller.autoSchedule,
);
tournamentMatchesRouter.post(
  "/reminders/starting-soon",
  requireAuth,
  requireTournamentMatchesAdminAccess,
  controller.sendReminders,
);

// Mounted at /api/matches
export const matchesRouter = Router();
matchesRouter.get("/:id", controller.getOne);
matchesRouter.patch("/:id", requireAuth, requireMatchAdminAccess, controller.update);
matchesRouter.patch("/:id/winner", requireAuth, requireMatchOfficiateAccess, controller.recordWinner);
