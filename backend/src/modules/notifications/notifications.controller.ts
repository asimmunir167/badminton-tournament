import { NextFunction, Request, RequestHandler, Response } from "express";
import * as notificationsService from "./notifications.service";
import { ApiError } from "../../middleware/errorHandler";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const listMine = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const notifications = await notificationsService.listMyNotifications(req.user.sub);
  res.status(200).json(notifications);
});

export const markRead = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const notification = await notificationsService.markRead(req.params.id, req.user.sub);
  res.status(200).json(notification);
});

export const markAllRead = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  await notificationsService.markAllRead(req.user.sub);
  res.status(204).send();
});
