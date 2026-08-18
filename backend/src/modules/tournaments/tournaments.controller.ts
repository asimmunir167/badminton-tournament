import { NextFunction, Request, RequestHandler, Response } from "express";
import * as tournamentsService from "./tournaments.service";
import { assignAdminSchema, createTournamentSchema, updateTournamentSchema } from "./tournaments.validation";
import { ApiError } from "../../middleware/errorHandler";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const list = wrap(async (_req, res) => {
  const tournaments = await tournamentsService.listTournaments();
  res.status(200).json(tournaments);
});

export const getOne = wrap(async (req, res) => {
  const tournament = await tournamentsService.getTournament(req.params.id);
  res.status(200).json(tournament);
});

export const create = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const input = createTournamentSchema.parse(req.body);
  const tournament = await tournamentsService.createTournament(input, req.user.sub);
  res.status(201).json(tournament);
});

export const update = wrap(async (req, res) => {
  const input = updateTournamentSchema.parse(req.body);
  const tournament = await tournamentsService.updateTournament(req.params.id, input);
  res.status(200).json(tournament);
});

export const remove = wrap(async (req, res) => {
  await tournamentsService.deleteTournament(req.params.id);
  res.status(204).send();
});

export const assignAdmin = wrap(async (req, res) => {
  const input = assignAdminSchema.parse(req.body);
  const link = await tournamentsService.assignAdmin(req.params.id, input.userId);
  res.status(201).json(link);
});

export const removeAdmin = wrap(async (req, res) => {
  await tournamentsService.removeAdmin(req.params.id, req.params.userId);
  res.status(204).send();
});
