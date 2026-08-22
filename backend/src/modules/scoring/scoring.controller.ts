import { NextFunction, Request, RequestHandler, Response } from "express";
import * as scoringService from "./scoring.service";
import { addPointSchema } from "./scoring.validation";
import { ApiError } from "../../middleware/errorHandler";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

function requireUser(req: Request) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  return req.user;
}

export const getState = wrap(async (req, res) => {
  const state = await scoringService.getState(req.params.id);
  res.status(200).json(state);
});

export const start = wrap(async (req, res) => {
  requireUser(req);
  const state = await scoringService.startMatch(req.params.id);
  res.status(200).json(state);
});

export const point = wrap(async (req, res) => {
  const user = requireUser(req);
  const input = addPointSchema.parse(req.body);
  const state = await scoringService.addPoint(req.params.id, input.entryId, user.sub);
  res.status(200).json(state);
});

export const undo = wrap(async (req, res) => {
  const user = requireUser(req);
  const state = await scoringService.undoLastPoint(req.params.id, user.sub);
  res.status(200).json(state);
});

export const pause = wrap(async (req, res) => {
  const user = requireUser(req);
  const state = await scoringService.pauseMatch(req.params.id, user.sub);
  res.status(200).json(state);
});

export const resume = wrap(async (req, res) => {
  const user = requireUser(req);
  const state = await scoringService.resumeMatch(req.params.id, user.sub);
  res.status(200).json(state);
});
