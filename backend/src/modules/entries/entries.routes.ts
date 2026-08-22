import { Router } from "express";
import * as controller from "./entries.controller";
import { requireAuth } from "../../middleware/auth";
import { requireCategoryTournamentAccess } from "../categories/categories.access";
import { requireEntryAccess } from "./entries.access";

// Mounted at /api/categories/:categoryId/entries (needs mergeParams to see categoryId)
export const categoryEntriesRouter = Router({ mergeParams: true });
categoryEntriesRouter.get("/", controller.list);
categoryEntriesRouter.post("/", requireAuth, requireCategoryTournamentAccess, controller.create);

// Mounted at /api/entries
export const entriesRouter = Router();
entriesRouter.patch("/:id", requireAuth, requireEntryAccess, controller.update);
entriesRouter.delete("/:id", requireAuth, requireEntryAccess, controller.remove);
