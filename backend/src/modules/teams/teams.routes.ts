import { Router } from "express";
import * as controller from "./teams.controller";
import { requireAuth, requireRole } from "../../middleware/auth";
import { requireCreateRole, requireTeamEditAccess, requireTeamStatusAccess } from "./teams.access";

// Mounted at /api/tournaments/:tournamentId/teams (needs mergeParams to see tournamentId)
export const tournamentTeamsRouter = Router({ mergeParams: true });
tournamentTeamsRouter.get("/", controller.listForTournament);
tournamentTeamsRouter.post("/", requireAuth, requireCreateRole, controller.create);

// Mounted at /api/teams
export const teamsRouter = Router();
teamsRouter.get("/:id", controller.getOne);
teamsRouter.patch("/:id", requireAuth, requireTeamEditAccess, controller.update);
teamsRouter.patch("/:id/status", requireAuth, requireTeamStatusAccess, controller.updateStatus);
teamsRouter.delete("/:id", requireAuth, requireRole("super_admin"), controller.remove);
