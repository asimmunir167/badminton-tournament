import { Router } from "express";
import * as controller from "./referees.controller";
import { requireAuth } from "../../middleware/auth";
import { requireRefereeAccess, requireRefereeCreateAccess } from "./referees.access";

// Mounted at /api/tournaments/:tournamentId/referees (needs mergeParams)
export const tournamentRefereesRouter = Router({ mergeParams: true });
tournamentRefereesRouter.get("/", requireAuth, requireRefereeCreateAccess, controller.listForTournament);
tournamentRefereesRouter.post("/", requireAuth, requireRefereeCreateAccess, controller.create);

// Mounted at /api/referees
export const refereesRouter = Router();
refereesRouter.get("/:id", requireAuth, requireRefereeAccess, controller.getOne);
refereesRouter.patch("/:id", requireAuth, requireRefereeAccess, controller.update);
refereesRouter.delete("/:id", requireAuth, requireRefereeAccess, controller.remove);
