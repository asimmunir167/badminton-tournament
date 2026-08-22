import { NextFunction, Request, RequestHandler, Response } from "express";
import * as pairsService from "./pairs.service";
import { createPairSchema } from "./pairs.validation";
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

export const listMine = wrap(async (req, res) => {
  const user = requireUser(req);
  const pairs = await pairsService.listMyPairs(user.sub);
  res.status(200).json(pairs);
});

export const listRequests = wrap(async (req, res) => {
  const user = requireUser(req);
  const requests = await pairsService.listMyPairRequests(user.sub);
  res.status(200).json(requests);
});

export const getOne = wrap(async (req, res) => {
  const pair = await pairsService.getPair(req.params.id);
  res.status(200).json(pair);
});

export const create = wrap(async (req, res) => {
  const user = requireUser(req);
  const input = createPairSchema.parse(req.body);
  const pair = await pairsService.createPairRequest(user.sub, input.partnerPlayerId);
  res.status(201).json(pair);
});

export const accept = wrap(async (req, res) => {
  const user = requireUser(req);
  const pair = await pairsService.acceptPair(req.params.id, user.sub);
  res.status(200).json(pair);
});

export const decline = wrap(async (req, res) => {
  const user = requireUser(req);
  const pair = await pairsService.declinePair(req.params.id, user.sub);
  res.status(200).json(pair);
});
