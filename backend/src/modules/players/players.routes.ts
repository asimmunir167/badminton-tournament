import { Router } from "express";
import * as controller from "./players.controller";
import { requireAuth } from "../../middleware/auth";
import { requireCreateAccess, requirePlayerAdminAccess, requirePlayerEditAccess } from "./players.access";
import { uploadImage } from "../../lib/uploads";

// Mounted at /api/districts/:districtId/players (needs mergeParams to see districtId)
export const districtPlayersRouter = Router({ mergeParams: true });
districtPlayersRouter.get("/", controller.listForDistrict);
districtPlayersRouter.post("/", requireAuth, requireCreateAccess, controller.create);

// Mounted at /api/players
export const playersRouter = Router();
playersRouter.get("/me", requireAuth, controller.getMine); // must precede "/:id"
playersRouter.post("/me/photo", requireAuth, uploadImage.single("photo"), controller.uploadMyPhoto); // must precede "/:id"
playersRouter.get("/search", requireAuth, controller.search); // must precede "/:id"
playersRouter.get("/:id", controller.getOne);
playersRouter.get("/:id/stats", controller.getStats);
playersRouter.patch("/:id", requireAuth, requirePlayerEditAccess, controller.update);
playersRouter.patch("/:id/status", requireAuth, requirePlayerAdminAccess, controller.updateStatus);
playersRouter.delete("/:id", requireAuth, requirePlayerAdminAccess, controller.remove);
