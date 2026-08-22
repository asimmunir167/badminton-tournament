import { Router } from "express";
import * as controller from "./notifications.controller";
import { requireAuth } from "../../middleware/auth";

export const notificationsRouter = Router();
notificationsRouter.get("/mine", requireAuth, controller.listMine);
notificationsRouter.post("/read-all", requireAuth, controller.markAllRead);
notificationsRouter.post("/:id/read", requireAuth, controller.markRead);
