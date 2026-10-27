import { NextFunction, Request, RequestHandler, Response } from "express";
import * as certificatesService from "./certificates.service";
import { ApiError } from "../../middleware/errorHandler";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

function baseUrl(req: Request): string {
  return `${req.protocol}://${req.get("host")}`;
}

export const issueForCategory = wrap(async (req, res) => {
  const issued = await certificatesService.issueCategoryCertificates(req.params.categoryId, baseUrl(req));
  res.status(201).json(issued);
});

export const listForTournament = wrap(async (req, res) => {
  const tournamentId = req.params.tournamentId;
  if (!tournamentId) throw new ApiError(400, "tournamentId required");
  res.status(200).json(await certificatesService.listTournamentCertificates(tournamentId));
});
