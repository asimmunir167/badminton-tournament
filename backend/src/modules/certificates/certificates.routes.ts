import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as controller from "./certificates.controller";

export const categoryCertificatesRouter = Router({ mergeParams: true });
categoryCertificatesRouter.post(
  "/issue",
  requireAuth,
  requireRole("super_admin", "tournament_admin"),
  controller.issueForCategory,
);

export const tournamentCertificatesRouter = Router({ mergeParams: true });
tournamentCertificatesRouter.get("/", requireAuth, controller.listForTournament);
