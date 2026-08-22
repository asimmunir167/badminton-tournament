import { NextFunction, Request, RequestHandler, Response } from "express";
import * as drawsService from "./draws.service";
import { generateDrawSchema } from "./draws.validation";
import { ApiError } from "../../middleware/errorHandler";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const getOne = wrap(async (req, res) => {
  const draw = await drawsService.getCurrentDraw(req.params.categoryId);
  res.status(200).json(draw);
});

export const generate = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const input = generateDrawSchema.parse(req.body ?? {});
  const draw = await drawsService.generateDraw(req.params.categoryId, input, req.user.sub);
  res.status(201).json(draw);
});

export const lock = wrap(async (req, res) => {
  const draw = await drawsService.lockDraw(req.params.categoryId);
  res.status(200).json(draw);
});

export const unlock = wrap(async (req, res) => {
  const draw = await drawsService.unlockDraw(req.params.categoryId);
  res.status(200).json(draw);
});
