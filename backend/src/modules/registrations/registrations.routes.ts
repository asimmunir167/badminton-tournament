import { Router } from "express";
import * as controller from "./registrations.controller";
import { requireAuth } from "../../middleware/auth";
import { uploadImage } from "../../lib/uploads";
import {
  requireRegistrationAdminAccess,
  requireRegistrationCreateAccess,
  requireRegistrationViewAccess,
  requireTournamentRegistrationsAccess,
} from "./registrations.access";

// Mounted at /api/tournaments/:tournamentId/registrations (needs mergeParams)
export const tournamentRegistrationsRouter = Router({ mergeParams: true });
tournamentRegistrationsRouter.get(
  "/",
  requireAuth,
  requireTournamentRegistrationsAccess,
  controller.listForTournament,
);
tournamentRegistrationsRouter.post("/", requireAuth, requireRegistrationCreateAccess, controller.create);

// Mounted at /api/registrations
export const registrationsRouter = Router();
registrationsRouter.get("/partner-requests/mine", requireAuth, controller.listPartnerRequests);
registrationsRouter.get("/mine", requireAuth, controller.listMine);
registrationsRouter.post("/:id/confirm-partner", requireAuth, controller.confirmPartner);
registrationsRouter.post("/:id/decline-partner", requireAuth, controller.declinePartner);
registrationsRouter.get("/:id", requireAuth, requireRegistrationViewAccess, controller.getOne);
registrationsRouter.patch("/:id/status", requireAuth, requireRegistrationAdminAccess, controller.review);
registrationsRouter.post("/:id/payment", requireAuth, requireRegistrationAdminAccess, controller.createPayment);
registrationsRouter.patch("/:id/payment", requireAuth, requireRegistrationAdminAccess, controller.updatePayment);
registrationsRouter.post("/:id/payment/submit", requireAuth, controller.submitPayment);
registrationsRouter.post(
  "/:id/payment/proof",
  requireAuth,
  uploadImage.single("proof"),
  controller.uploadProof,
);
