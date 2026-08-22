import { Router } from "express";
import * as controller from "./categories.controller";
import { requireAuth } from "../../middleware/auth";
import { requireCategoryAccess, requireTournamentAccessForCreate } from "./categories.access";

// Mounted at /api/tournaments/:tournamentId/categories (needs mergeParams to see tournamentId)
export const tournamentCategoriesRouter = Router({ mergeParams: true });
tournamentCategoriesRouter.get("/", controller.listForTournament);
tournamentCategoriesRouter.post("/", requireAuth, requireTournamentAccessForCreate, controller.create);

// Mounted at /api/categories
export const categoriesRouter = Router();
categoriesRouter.get("/:id", controller.getOne);
categoriesRouter.patch("/:id", requireAuth, requireCategoryAccess, controller.update);
categoriesRouter.delete("/:id", requireAuth, requireCategoryAccess, controller.remove);
