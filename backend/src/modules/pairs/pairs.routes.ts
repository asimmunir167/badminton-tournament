import { Router } from "express";
import * as controller from "./pairs.controller";
import { requireAuth } from "../../middleware/auth";

export const pairsRouter = Router();
pairsRouter.get("/mine", requireAuth, controller.listMine); // must precede "/:id"
pairsRouter.get("/requests/mine", requireAuth, controller.listRequests); // must precede "/:id"
pairsRouter.post("/", requireAuth, controller.create);
pairsRouter.get("/:id", controller.getOne);
pairsRouter.post("/:id/accept", requireAuth, controller.accept);
pairsRouter.post("/:id/decline", requireAuth, controller.decline);
