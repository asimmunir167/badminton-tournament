import { NextFunction, Request, RequestHandler, Response } from "express";
import type { Player } from "@prisma/client";
import * as playersService from "./players.service";
import { canViewIdDocument } from "./players.access";
import {
  createPlayerSchema,
  searchPlayersQuerySchema,
  updatePlayerSchema,
  updatePlayerStatusSchema,
} from "./players.validation";
import { ApiError } from "../../middleware/errorHandler";
import { absoluteUploadUrl } from "../../lib/uploads";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

async function serialize(player: Player, user?: { sub: string; role: string }) {
  if (await canViewIdDocument(player, user)) {
    return player;
  }
  const { idDocumentUrl: _idDocumentUrl, cnic: _cnic, ...rest } = player;
  return rest;
}

export const listForDistrict = wrap(async (req, res) => {
  const players = await playersService.listPlayersForDistrict(req.params.districtId);
  const serialized = await Promise.all(players.map((p) => serialize(p, req.user)));
  res.status(200).json(serialized);
});

export const getOne = wrap(async (req, res) => {
  const player = await playersService.getPlayerWithDistrict(req.params.id);
  res.status(200).json(await serialize(player, req.user));
});

export const getMine = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const player = await playersService.getMyPlayerProfile(req.user.sub);
  res.status(200).json(await serialize(player, req.user));
});

export const search = wrap(async (req, res) => {
  const query = searchPlayersQuerySchema.parse(req.query);
  let excludePlayerId: string | undefined;
  if (req.user) {
    try {
      const me = await playersService.getMyPlayerProfile(req.user.sub);
      excludePlayerId = me.id;
    } catch {
      // no profile yet — nothing to exclude
    }
  }
  const players = await playersService.searchPlayers(query, excludePlayerId);
  res.status(200).json(players);
});

export const getStats = wrap(async (req, res) => {
  const stats = await playersService.getPlayerStats(req.params.id);
  res.status(200).json(stats);
});

export const create = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const input = createPlayerSchema.parse(req.body);
  const userId = req.user.role === "player" ? req.user.sub : null;
  const player = await playersService.createPlayer(req.params.districtId, input, userId);
  res.status(201).json(await serialize(player, req.user));
});

export const uploadMyPhoto = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  if (!req.file) {
    throw new ApiError(400, "No photo file was uploaded");
  }
  const me = await playersService.getMyPlayerProfile(req.user.sub);
  const photoUrl = absoluteUploadUrl(req, req.file.filename);
  const player = await playersService.updatePlayer(me.id, { photoUrl });
  res.status(200).json(await serialize(player, req.user));
});

export const update = wrap(async (req, res) => {
  const input = updatePlayerSchema.parse(req.body);
  const player = await playersService.updatePlayer(req.params.id, input);
  res.status(200).json(await serialize(player, req.user));
});

export const updateStatus = wrap(async (req, res) => {
  const input = updatePlayerStatusSchema.parse(req.body);
  const player = await playersService.updatePlayerStatus(req.params.id, input.status);
  res.status(200).json(await serialize(player, req.user));
});

export const remove = wrap(async (req, res) => {
  await playersService.deletePlayer(req.params.id);
  res.status(204).send();
});
