import { Router } from "express";
import * as controller from "./draws.controller";
import { requireAuth } from "../../middleware/auth";
import { requireCategoryTournamentAccess } from "../categories/categories.access";

// Mounted at /api/categories/:categoryId/draw (needs mergeParams to see categoryId)
export const categoryDrawRouter = Router({ mergeParams: true });
categoryDrawRouter.get("/", controller.getOne);
categoryDrawRouter.post("/generate", requireAuth, requireCategoryTournamentAccess, controller.generate);
categoryDrawRouter.post("/advance", requireAuth, requireCategoryTournamentAccess, controller.advance);
categoryDrawRouter.post("/lock", requireAuth, requireCategoryTournamentAccess, controller.lock);
categoryDrawRouter.post("/unlock", requireAuth, requireCategoryTournamentAccess, controller.unlock);
