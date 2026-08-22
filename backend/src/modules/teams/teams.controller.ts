import { NextFunction, Request, RequestHandler, Response } from "express";
import * as teamsService from "./teams.service";
import { createTeamSchema, updateTeamSchema, updateTeamStatusSchema } from "./teams.validation";
import { ApiError } from "../../middleware/errorHandler";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const listForTournament = wrap(async (req, res) => {
  const teams = await teamsService.listTeamsForTournament(req.params.tournamentId);
  res.status(200).json(teams);
});

export const getOne = wrap(async (req, res) => {
  const team = await teamsService.getTeam(req.params.id);
  res.status(200).json(team);
});

export const create = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const input = createTeamSchema.parse(req.body);
  const managerUserId = req.user.role === "team_manager" ? req.user.sub : null;
  const team = await teamsService.createTeam(req.params.tournamentId, input, managerUserId);
  res.status(201).json(team);
});

export const update = wrap(async (req, res) => {
  const input = updateTeamSchema.parse(req.body);
  const team = await teamsService.updateTeam(req.params.id, input);
  res.status(200).json(team);
});

export const updateStatus = wrap(async (req, res) => {
  const input = updateTeamStatusSchema.parse(req.body);
  const team = await teamsService.updateTeamStatus(req.params.id, input.status);
  res.status(200).json(team);
});

export const remove = wrap(async (req, res) => {
  await teamsService.deleteTeam(req.params.id);
  res.status(204).send();
});
