import { Router } from "express";
import * as controller from "./districts.controller";
import { requireAuth, requireRole } from "../../middleware/auth";
import { tehsilsRouter } from "../tehsils/tehsils.routes";

export const districtsRouter = Router();

districtsRouter.get("/", controller.list);
districtsRouter.get("/:id", controller.getOne);
districtsRouter.use("/:districtId/tehsils", tehsilsRouter);
districtsRouter.post("/", requireAuth, requireRole("super_admin"), controller.create);
districtsRouter.patch("/:id", requireAuth, requireRole("super_admin"), controller.update);
districtsRouter.delete("/:id", requireAuth, requireRole("super_admin"), controller.remove);
