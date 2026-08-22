import { NextFunction, Request, RequestHandler, Response } from "express";
import * as usersService from "./users.service";
import { listUsersQuerySchema } from "./users.validation";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const list = wrap(async (req, res) => {
  const query = listUsersQuerySchema.parse(req.query);
  const users = await usersService.listUsers(query);
  res.status(200).json(users);
});
