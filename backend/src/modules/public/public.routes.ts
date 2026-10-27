import { Router } from "express";
import * as controller from "./public.controller";

/** Public spectator API — no auth required. */
export const publicRouter = Router();

publicRouter.get("/tournaments/:tournamentId", controller.getTournament);
publicRouter.get("/tournaments/:tournamentId/matches", controller.getMatches);
publicRouter.get("/tournaments/:tournamentId/live", controller.getLive);
publicRouter.get("/tournaments/:tournamentId/courts", controller.getCourts);
