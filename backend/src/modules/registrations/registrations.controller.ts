import { NextFunction, Request, RequestHandler, Response } from "express";
import * as registrationsService from "./registrations.service";
import {
  createPaymentSchema,
  createRegistrationSchema,
  listRegistrationsQuerySchema,
  updatePaymentSchema,
  updateRegistrationStatusSchema,
} from "./registrations.validation";
import { ApiError } from "../../middleware/errorHandler";

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const listForTournament = wrap(async (req, res) => {
  const query = listRegistrationsQuerySchema.parse(req.query);
  const registrations = await registrationsService.listRegistrationsForTournament(
    req.params.tournamentId,
    query.status,
  );
  res.status(200).json(registrations);
});

export const getOne = wrap(async (req, res) => {
  const registration = await registrationsService.getRegistration(req.params.id);
  res.status(200).json(registration);
});

export const listMine = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const registrations = await registrationsService.listMyRegistrations(req.user.sub);
  res.status(200).json(registrations);
});

export const create = wrap(async (req, res) => {
  const input = createRegistrationSchema.parse(req.body);
  const registration = await registrationsService.createRegistration(req.params.tournamentId, input);
  res.status(201).json(registration);
});

export const review = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const input = updateRegistrationStatusSchema.parse(req.body);
  const registration = await registrationsService.reviewRegistration(req.params.id, input.status, req.user.sub);
  res.status(200).json(registration);
});

export const listPartnerRequests = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const requests = await registrationsService.listMyPartnerRequests(req.user.sub);
  res.status(200).json(requests);
});

export const confirmPartner = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const registration = await registrationsService.confirmPartner(req.params.id, req.user.sub);
  res.status(200).json(registration);
});

export const declinePartner = wrap(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  const registration = await registrationsService.declinePartner(req.params.id, req.user.sub);
  res.status(200).json(registration);
});

export const createPayment = wrap(async (req, res) => {
  const input = createPaymentSchema.parse(req.body);
  const payment = await registrationsService.createPayment(req.params.id, input);
  res.status(201).json(payment);
});

export const updatePayment = wrap(async (req, res) => {
  const input = updatePaymentSchema.parse(req.body);
  const payment = await registrationsService.updatePayment(req.params.id, input);
  res.status(200).json(payment);
});
