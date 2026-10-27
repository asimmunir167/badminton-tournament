import { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import * as tehsilsService from "./tehsils.service";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

const createTehsilSchema = z.object({ name: z.string().min(2).max(120) });

export const listForDistrict = wrap(async (req, res) => {
  const tehsils = await tehsilsService.listTehsilsForDistrict(req.params.districtId);
  res.status(200).json(tehsils);
});

export const create = wrap(async (req, res) => {
  const input = createTehsilSchema.parse(req.body);
  const tehsil = await tehsilsService.createTehsil(req.params.districtId, input.name);
  res.status(201).json(tehsil);
});
