import { NextFunction, Request, RequestHandler, Response } from "express";
import * as categoriesService from "./categories.service";
import { createCategorySchema, updateCategorySchema } from "./categories.validation";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const listForTournament = wrap(async (req, res) => {
  const categories = await categoriesService.listCategoriesForTournament(req.params.tournamentId);
  res.status(200).json(categories);
});

export const getOne = wrap(async (req, res) => {
  const category = await categoriesService.getCategory(req.params.id);
  res.status(200).json(category);
});

export const create = wrap(async (req, res) => {
  const input = createCategorySchema.parse(req.body);
  const category = await categoriesService.createCategory(req.params.tournamentId, input);
  res.status(201).json(category);
});

export const update = wrap(async (req, res) => {
  const input = updateCategorySchema.parse(req.body);
  const category = await categoriesService.updateCategory(req.params.id, input);
  res.status(200).json(category);
});

export const remove = wrap(async (req, res) => {
  await categoriesService.deleteCategory(req.params.id);
  res.status(204).send();
});
