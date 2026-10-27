import { Router } from "express";
import * as controller from "./tehsils.controller";
import { requireAuth, requireRole } from "../../middleware/auth";

export const tehsilsRouter = Router({ mergeParams: true });

tehsilsRouter.get("/", controller.listForDistrict);
tehsilsRouter.post("/", requireAuth, requireRole("super_admin"), controller.create);
