import { Router } from "express";
import * as controller from "./rankings.controller";
import { requireAuth, requireRole } from "../../middleware/auth";
import { requireCategoryTournamentAccess } from "../categories/categories.access";
import { requireTournamentRankingsAccess } from "./rankings.access";

// Mounted at /api/categories/:categoryId/rankings (needs mergeParams)
export const categoryRankingsRouter = Router({ mergeParams: true });
categoryRankingsRouter.get("/", controller.getCategoryRankings);
categoryRankingsRouter.post(
  "/compute",
  requireAuth,
  requireCategoryTournamentAccess,
  controller.computeCategoryRankings,
);

// Mounted at /api/tournaments/:tournamentId/rankings (needs mergeParams)
export const tournamentRankingsRouter = Router({ mergeParams: true });
tournamentRankingsRouter.get("/", controller.getTournamentRankings);
tournamentRankingsRouter.post(
  "/compute",
  requireAuth,
  requireTournamentRankingsAccess,
  controller.computeTournamentRankings,
);

// Mounted at /api/rankings
export const rankingsRouter = Router();
rankingsRouter.get("/", controller.getAllTimeRankings);
rankingsRouter.post("/compute", requireAuth, requireRole("super_admin"), controller.computeAllTimeRankings);
