import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../middleware/errorHandler";
import { isTournamentAdmin } from "../tournaments/tournaments.service";
import { isDistrictManagerOf } from "../districts/districts.service";
import { getTeam } from "./teams.service";

const CREATE_ROLES = ["team_manager", "district_manager", "tournament_admin", "super_admin"];

export function requireCreateRole(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  if (!CREATE_ROLES.includes(req.user.role)) {
    next(new ApiError(403, "Insufficient permissions"));
    return;
  }
  next();
}

// General field edits: super_admin, the tournament's admin, the team's own
// manager, or the district_manager of the team's district.
export async function requireTeamEditAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  if (req.user.role === "super_admin") {
    next();
    return;
  }

  const team = await getTeam(req.params.id);

  if (req.user.role === "tournament_admin" && (await isTournamentAdmin(team.tournamentId, req.user.sub))) {
    next();
    return;
  }
  if (team.managerUserId === req.user.sub) {
    next();
    return;
  }
  if (req.user.role === "district_manager" && (await isDistrictManagerOf(team.districtId, req.user.sub))) {
    next();
    return;
  }

  next(new ApiError(403, "Insufficient permissions"));
}

// Status transitions (approve/reject) are tournament-administration
// authority; a team's own manager may only withdraw their own team.
export async function requireTeamStatusAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new ApiError(401, "Not authenticated"));
    return;
  }
  if (req.user.role === "super_admin") {
    next();
    return;
  }

  const team = await getTeam(req.params.id);

  if (req.user.role === "tournament_admin" && (await isTournamentAdmin(team.tournamentId, req.user.sub))) {
    next();
    return;
  }
  if (team.managerUserId === req.user.sub && req.body?.status === "WITHDRAWN") {
    next();
    return;
  }

  next(new ApiError(403, "Insufficient permissions"));
}
