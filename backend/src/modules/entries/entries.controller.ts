import { NextFunction, Request, RequestHandler, Response } from "express";
import * as entriesService from "./entries.service";
import { createEntrySchema, updateEntrySchema } from "./entries.validation";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const list = wrap(async (req, res) => {
  const entries = await entriesService.listEntriesForCategory(req.params.categoryId);
  res.status(200).json(entries);
});

export const create = wrap(async (req, res) => {
  const input = createEntrySchema.parse(req.body);
  const entry = await entriesService.createEntry(req.params.categoryId, input);
  res.status(201).json(entry);
});

export const update = wrap(async (req, res) => {
  const input = updateEntrySchema.parse(req.body);
  const entry = await entriesService.updateEntry(req.params.id, input);
  res.status(200).json(entry);
});

export const remove = wrap(async (req, res) => {
  await entriesService.deleteEntry(req.params.id);
  res.status(204).send();
});
