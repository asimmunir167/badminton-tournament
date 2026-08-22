import { Router } from "express";
import * as controller from "./scoring.controller";
import { requireAuth } from "../../middleware/auth";
import { requireMatchOfficiateAccess } from "../matches/matches.access";

// Mounted at /api/matches/:id/scoring (needs mergeParams to see :id)
export const scoringRouter = Router({ mergeParams: true });
scoringRouter.get("/", controller.getState);
scoringRouter.post("/start", requireAuth, requireMatchOfficiateAccess, controller.start);
scoringRouter.post("/point", requireAuth, requireMatchOfficiateAccess, controller.point);
scoringRouter.post("/undo", requireAuth, requireMatchOfficiateAccess, controller.undo);
scoringRouter.post("/pause", requireAuth, requireMatchOfficiateAccess, controller.pause);
scoringRouter.post("/resume", requireAuth, requireMatchOfficiateAccess, controller.resume);
