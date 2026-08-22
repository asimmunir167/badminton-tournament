import { Router } from "express";
import * as controller from "./users.controller";
import { requireAuth, requireRole } from "../../middleware/auth";

export const usersRouter = Router();
usersRouter.get("/", requireAuth, requireRole("super_admin", "tournament_admin"), controller.list);
