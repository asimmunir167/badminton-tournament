import { NextFunction, Request, RequestHandler, Response } from "express";
import * as courtsService from "./courts.service";
import { createCourtSchema, updateCourtSchema } from "./courts.validation";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const listForTournament = wrap(async (req, res) => {
  const courts = await courtsService.listCourtsForTournament(req.params.tournamentId);
  res.status(200).json(courts);
});

export const getOne = wrap(async (req, res) => {
  const court = await courtsService.getCourtWithMatchInfo(req.params.id);
  res.status(200).json(court);
});

export const create = wrap(async (req, res) => {
  const input = createCourtSchema.parse(req.body);
  const court = await courtsService.createCourt(req.params.tournamentId, input);
  res.status(201).json(court);
});

export const update = wrap(async (req, res) => {
  const input = updateCourtSchema.parse(req.body);
  const court = await courtsService.updateCourt(req.params.id, input);
  res.status(200).json(court);
});

export const remove = wrap(async (req, res) => {
  await courtsService.deleteCourt(req.params.id);
  res.status(204).send();
});
