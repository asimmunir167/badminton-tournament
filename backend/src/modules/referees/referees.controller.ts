import { NextFunction, Request, RequestHandler, Response } from "express";
import * as refereesService from "./referees.service";
import { createRefereeSchema, updateRefereeSchema } from "./referees.validation";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const listForTournament = wrap(async (req, res) => {
  const referees = await refereesService.listRefereesForTournament(req.params.tournamentId);
  res.status(200).json(referees);
});

export const getOne = wrap(async (req, res) => {
  const referee = await refereesService.getReferee(req.params.id);
  res.status(200).json(referee);
});

export const create = wrap(async (req, res) => {
  const input = createRefereeSchema.parse(req.body);
  const referee = await refereesService.createReferee(req.params.tournamentId, input);
  res.status(201).json(referee);
});

export const update = wrap(async (req, res) => {
  const input = updateRefereeSchema.parse(req.body);
  const referee = await refereesService.updateReferee(req.params.id, input);
  res.status(200).json(referee);
});

export const remove = wrap(async (req, res) => {
  await refereesService.deleteReferee(req.params.id);
  res.status(204).send();
});
