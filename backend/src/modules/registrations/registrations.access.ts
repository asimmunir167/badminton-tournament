import { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { isDistrictManagerOf } from "../districts/districts.service";
import { isTournamentAdmin } from "../tournaments/tournaments.service";
import { getRegistration } from "./registrations.service";

// Creating a registration: super_admin, the tournament's admin, the player
// themself, their district_manager, or their team's manager.
export async function requireRegistrationCreateAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  const { role, sub } = req.user;

  if (role === "super_admin") {
    next();
    return;
  }
  if (role === "tournament_admin" && (await isTournamentAdmin(req.params.tournamentId, sub))) {
    next();
    return;
  }

  const playerId = req.body?.playerId;
  if (!playerId) {
    next(new ApiError(400, "playerId is required"));
    return;
  }
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    next(new ApiError(404, "Player not found"));
    return;
  }

  if (player.userId === sub) {
    next();
    return;
  }
  if (role === "district_manager" && (await isDistrictManagerOf(player.districtId, sub))) {
    next();
    return;
  }
  if (role === "team_manager" && player.teamId) {
    const team = await prisma.team.findUnique({ where: { id: player.teamId } });
    if (team && team.managerUserId === sub) {
      next();
      return;
    }
  }

  next(new ApiError(403, "Insufficient permissions"));
}

// Listing every registration for a tournament: administrative only.
export async function requireTournamentRegistrationsAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  if (req.user.role === "super_admin") {
    next();
    return;
  }
  if (req.user.role !== "tournament_admin") {
    next(new ApiError(403, "Insufficient permissions"));
    return;
  }
  const allowed = await isTournamentAdmin(req.params.tournamentId, req.user.sub);
  if (!allowed) {
    next(new ApiError(403, "Not an admin of this tournament"));
    return;
  }
  next();
}

// Viewing a single registration: admin, the player themself, or their
// district_manager / team manager.
export async function requireRegistrationViewAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  const { role, sub } = req.user;

  if (role === "super_admin") {
    next();
    return;
  }

  const registration = await getRegistration(req.params.id);

  if (role === "tournament_admin" && (await isTournamentAdmin(registration.tournamentId, sub))) {
    next();
    return;
  }
  if (registration.player?.userId === sub) {
    next();
    return;
  }
  if (
    role === "district_manager" &&
    registration.player &&
    (await isDistrictManagerOf(registration.player.districtId, sub))
  ) {
    next();
    return;
  }
  if (role === "team_manager" && registration.player?.teamId) {
    const team = await prisma.team.findUnique({ where: { id: registration.player.teamId } });
    if (team && team.managerUserId === sub) {
      next();
      return;
    }
  }

  next(new ApiError(403, "Insufficient permissions"));
}

// Reviewing (approve/reject) and payment management: administrative only.
export async function requireRegistrationAdminAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  if (req.user.role === "super_admin") {
    next();
    return;
  }
  if (req.user.role !== "tournament_admin") {
    next(new ApiError(403, "Insufficient permissions"));
    return;
  }

  const registration = await getRegistration(req.params.id);
  const allowed = await isTournamentAdmin(registration.tournamentId, req.user.sub);
  if (!allowed) {
    next(new ApiError(403, "Not an admin of this tournament"));
    return;
  }
  next();
}
