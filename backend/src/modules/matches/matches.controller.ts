import { NextFunction, Request, RequestHandler, Response } from "express";
import * as matchesService from "./matches.service";
import * as remindersService from "./reminders.service";
import { autoScheduleSchema, recordWinnerSchema, updateMatchSchema } from "./matches.validation";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const listForTournament = wrap(async (req, res) => {
  const matches = await matchesService.listMatchesForTournament(req.params.tournamentId);
  res.status(200).json(matches);
});

export const autoSchedule = wrap(async (req, res) => {
  const input = autoScheduleSchema.parse(req.body ?? {});
  const matches = await matchesService.autoScheduleTournament(req.params.tournamentId, input);
  void remindersService.notifyMatchScheduled(req.params.tournamentId);
  res.status(200).json(matches);
});

export const sendReminders = wrap(async (req, res) => {
  const withinMinutes = Number(req.body?.withinMinutes ?? 45);
  const result = await remindersService.sendStartingSoonReminders(req.params.tournamentId, withinMinutes);
  res.status(200).json(result);
});

export const getOne = wrap(async (req, res) => {
  const match = await matchesService.getMatch(req.params.id);
  res.status(200).json(match);
});

export const update = wrap(async (req, res) => {
  const input = updateMatchSchema.parse(req.body);
  const match = await matchesService.updateMatch(req.params.id, input);
  res.status(200).json(match);
});

export const recordWinner = wrap(async (req, res) => {
  const input = recordWinnerSchema.parse(req.body);
  const match = await matchesService.recordWinner(req.params.id, input.winnerEntryId);
  res.status(200).json(match);
});
