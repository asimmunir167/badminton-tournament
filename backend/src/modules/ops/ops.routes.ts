import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as controller from "./ops.controller";

export const opsRouter = Router();

opsRouter.get("/stats", requireAuth, controller.globalStats);
opsRouter.get(
  "/tournaments/:tournamentId",
  requireAuth,
  requireRole("super_admin", "tournament_admin"),
  controller.tournamentOps,
);
opsRouter.get(
  "/tournaments/:tournamentId/export/registrations.csv",
  requireAuth,
  requireRole("super_admin", "tournament_admin"),
  controller.exportCsv,
);
