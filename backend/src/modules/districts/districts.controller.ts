import { NextFunction, Request, RequestHandler, Response } from "express";
import * as districtsService from "./districts.service";
import { createDistrictSchema, updateDistrictSchema } from "./districts.validation";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const list = wrap(async (_req, res) => {
  const districts = await districtsService.listDistricts();
  res.status(200).json(districts);
});

export const getOne = wrap(async (req, res) => {
  const district = await districtsService.getDistrict(req.params.id);
  res.status(200).json(district);
});

export const create = wrap(async (req, res) => {
  const input = createDistrictSchema.parse(req.body);
  const district = await districtsService.createDistrict(input);
  res.status(201).json(district);
});

export const update = wrap(async (req, res) => {
  const input = updateDistrictSchema.parse(req.body);
  const district = await districtsService.updateDistrict(req.params.id, input);
  res.status(200).json(district);
});

export const remove = wrap(async (req, res) => {
  await districtsService.deleteDistrict(req.params.id);
  res.status(204).send();
});
