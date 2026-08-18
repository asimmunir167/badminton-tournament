import { Router } from "express";
import * as controller from "./districts.controller";
import { requireAuth, requireRole } from "../../middleware/auth";

export const districtsRouter = Router();

districtsRouter.get("/", controller.list);
districtsRouter.get("/:id", controller.getOne);
districtsRouter.post("/", requireAuth, requireRole("super_admin"), controller.create);
districtsRouter.patch("/:id", requireAuth, requireRole("super_admin"), controller.update);
districtsRouter.delete("/:id", requireAuth, requireRole("super_admin"), controller.remove);
