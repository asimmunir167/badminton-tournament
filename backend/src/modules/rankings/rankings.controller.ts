import { NextFunction, Request, RequestHandler, Response } from "express";
import * as rankingsService from "./rankings.service";
import { rankingsQuerySchema } from "./rankings.validation";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const getCategoryRankings = wrap(async (req, res) => {
  const rankings = await rankingsService.listCategoryRankings(req.params.categoryId);
  res.status(200).json(rankings);
});

export const computeCategoryRankings = wrap(async (req, res) => {
  const rankings = await rankingsService.computeCategoryPlacements(req.params.categoryId);
  res.status(200).json(rankings);
});

export const getTournamentRankings = wrap(async (req, res) => {
  const query = rankingsQuerySchema.parse(req.query);
  const rankings = await rankingsService.listTournamentRankings(req.params.tournamentId, query.entityType);
  res.status(200).json(rankings);
});

export const computeTournamentRankings = wrap(async (req, res) => {
  const rankings = await rankingsService.computeTournamentRollup(req.params.tournamentId);
  res.status(200).json(rankings);
});

export const getAllTimeRankings = wrap(async (req, res) => {
  const query = rankingsQuerySchema.parse(req.query);
  const rankings = await rankingsService.listAllTimeRankings(query.entityType);
  res.status(200).json(rankings);
});

export const computeAllTimeRankings = wrap(async (_req, res) => {
  const rankings = await rankingsService.computeAllTimeRollup();
  res.status(200).json(rankings);
});
