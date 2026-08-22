import { Router } from "express";
import * as controller from "./courts.controller";
import { requireAuth } from "../../middleware/auth";
import { requireCourtAccess, requireCourtCreateAccess } from "./courts.access";

// Mounted at /api/tournaments/:tournamentId/courts (needs mergeParams)
export const tournamentCourtsRouter = Router({ mergeParams: true });
tournamentCourtsRouter.get("/", controller.listForTournament);
tournamentCourtsRouter.post("/", requireAuth, requireCourtCreateAccess, controller.create);

// Mounted at /api/courts
export const courtsRouter = Router();
courtsRouter.get("/:id", controller.getOne);
courtsRouter.patch("/:id", requireAuth, requireCourtAccess, controller.update);
courtsRouter.delete("/:id", requireAuth, requireCourtAccess, controller.remove);
