import { NextFunction, Request, RequestHandler, Response } from "express";
import * as opsService from "./ops.service";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const globalStats = wrap(async (_req, res) => {
  res.status(200).json(await opsService.getGlobalOpsStats());
});

export const tournamentOps = wrap(async (req, res) => {
  res.status(200).json(await opsService.getTournamentOps(req.params.tournamentId));
});

export const exportCsv = wrap(async (req, res) => {
  const csv = await opsService.exportRegistrationsCsv(req.params.tournamentId);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="registrations-${req.params.tournamentId}.csv"`);
  res.status(200).send(csv);
});
