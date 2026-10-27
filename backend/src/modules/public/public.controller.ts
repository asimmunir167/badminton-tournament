import { NextFunction, Request, RequestHandler, Response } from "express";
import * as publicService from "./public.service";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const getTournament = wrap(async (req, res) => {
  const data = await publicService.getSpectatorTournament(req.params.tournamentId);
  res.status(200).json(data);
});

export const getMatches = wrap(async (req, res) => {
  const data = await publicService.getSpectatorMatches(req.params.tournamentId);
  res.status(200).json(data);
});

export const getLive = wrap(async (req, res) => {
  const data = await publicService.getSpectatorLive(req.params.tournamentId);
  res.status(200).json(data);
});

export const getCourts = wrap(async (req, res) => {
  const data = await publicService.getSpectatorCourts(req.params.tournamentId);
  res.status(200).json(data);
});
