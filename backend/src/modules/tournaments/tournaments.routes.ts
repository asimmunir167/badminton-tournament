import { Router } from "express";
import * as controller from "./tournaments.controller";
import { requireAuth, requireRole } from "../../middleware/auth";
import { requireTournamentAccess } from "./tournaments.access";

export const tournamentsRouter = Router();

tournamentsRouter.get("/", controller.list);
tournamentsRouter.get("/:id", controller.getOne);
tournamentsRouter.post("/", requireAuth, requireRole("super_admin"), controller.create);
tournamentsRouter.patch("/:id", requireAuth, requireTournamentAccess, controller.update);
tournamentsRouter.delete("/:id", requireAuth, requireRole("super_admin"), controller.remove);
tournamentsRouter.post("/:id/admins", requireAuth, requireRole("super_admin"), controller.assignAdmin);
tournamentsRouter.delete("/:id/admins/:userId", requireAuth, requireRole("super_admin"), controller.removeAdmin);
