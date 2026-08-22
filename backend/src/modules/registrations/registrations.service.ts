import { RegistrationStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { createNotification } from "../notifications/notifications.service";
import type { CreatePaymentInput, CreateRegistrationInput, UpdatePaymentInput } from "./registrations.validation";

export async function listRegistrationsForTournament(tournamentId: string, status?: RegistrationStatus) {
  return prisma.registration.findMany({
    where: { tournamentId, ...(status ? { status } : {}) },
    orderBy: { submittedAt: "desc" },
    include: { player: true, partner: true, category: true, payment: true },
  });
}

export async function getRegistration(id: string) {
  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { player: true, partner: true, category: true, payment: true, tournament: true },
  });
  if (!registration) {
    throw new ApiError(404, "Registration not found");
  }
  return registration;
}

export async function createRegistration(tournamentId: string, input: CreateRegistrationInput) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  const player = await prisma.player.findUnique({ where: { id: input.playerId } });
  if (!player) {
    throw new ApiError(404, "Player not found");
  }

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category || category.tournamentId !== tournamentId) {
    throw new ApiError(404, "Category not found in this tournament");
  }

  let partnerPlayerId = input.partnerPlayerId;
  let partnerConfirmedAt: Date | null = null;

  // Applying via an existing standing Pair implies consent already happened
  // when the pair was formed, so it auto-confirms — no second per-tournament
  // confirmation step needed (unlike the raw partnerPlayerId path below).
  if (input.pairId) {
    const pair = await prisma.pair.findUnique({ where: { id: input.pairId } });
    if (!pair) {
      throw new ApiError(404, "Pair not found");
    }
    if (pair.status !== "ACTIVE") {
      throw new ApiError(409, "This pair is not an active partnership");
    }
    if (pair.player1Id !== input.playerId && pair.player2Id !== input.playerId) {
      throw new ApiError(403, "playerId is not a member of this pair");
    }
    partnerPlayerId = pair.player1Id === input.playerId ? pair.player2Id : pair.player1Id;
    partnerConfirmedAt = new Date();
  }

  if (category.type === "DOUBLES") {
    if (!partnerPlayerId) {
      throw new ApiError(400, "This is a doubles category — partnerPlayerId or pairId is required");
    }
    if (partnerPlayerId === input.playerId) {
      throw new ApiError(400, "playerId and partnerPlayerId must be different players");
    }
    const partner = await prisma.player.findUnique({ where: { id: partnerPlayerId } });
    if (!partner) {
      throw new ApiError(404, "Partner player not found");
    }
  } else if (partnerPlayerId) {
    throw new ApiError(400, "Singles categories don't take a partner");
  }

  if (new Date() > tournament.registrationDeadline) {
    throw new ApiError(409, "The registration deadline for this tournament has passed");
  }

  const duplicate = await prisma.registration.findFirst({
    where: { tournamentId, playerId: input.playerId, categoryId: input.categoryId },
  });
  if (duplicate) {
    throw new ApiError(409, "This player is already registered for this category");
  }

  return prisma.registration.create({
    data: {
      tournamentId,
      playerId: input.playerId,
      categoryId: input.categoryId,
      partnerPlayerId,
      partnerConfirmedAt,
      pairId: input.pairId,
      ...(input.amount
        ? { payment: { create: { amount: input.amount, method: input.method ?? "MANUAL" } } }
        : {}),
    },
    include: { payment: true },
  });
}

export async function listMyRegistrations(userId: string) {
  const player = await prisma.player.findFirst({ where: { userId } });
  if (!player) {
    return [];
  }

  const registrations = await prisma.registration.findMany({
    where: { OR: [{ playerId: player.id }, { partnerPlayerId: player.id }] },
    orderBy: { submittedAt: "desc" },
    include: { category: true, tournament: true, partner: true, player: true },
  });

  return Promise.all(
    registrations.map(async (registration) => {
      let drawPublished = false;
      if (registration.status === "APPROVED" && registration.categoryId && registration.playerId) {
        const entry = await prisma.categoryEntry.findFirst({
          where: {
            categoryId: registration.categoryId,
            OR: [{ player1Id: registration.playerId }, { player2Id: registration.playerId }],
          },
        });
        if (entry) {
          const match = await prisma.match.findFirst({
            where: { OR: [{ entry1Id: entry.id }, { entry2Id: entry.id }] },
          });
          drawPublished = !!match;
        }
      }
      return { ...registration, drawPublished };
    }),
  );
}

export async function listMyPartnerRequests(userId: string) {
  return prisma.registration.findMany({
    where: {
      status: "PENDING",
      partnerConfirmedAt: null,
      partner: { userId },
    },
    orderBy: { submittedAt: "desc" },
    include: { player: true, category: true, tournament: true },
  });
}

async function getRegistrationAsPartner(id: string, userId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { partner: true },
  });
  if (!registration) {
    throw new ApiError(404, "Registration not found");
  }
  if (!registration.partner || registration.partner.userId !== userId) {
    throw new ApiError(403, "You are not the partner named on this registration");
  }
  if (registration.status !== "PENDING") {
    throw new ApiError(409, "This registration is no longer pending");
  }
  return registration;
}

export async function confirmPartner(id: string, userId: string) {
  const registration = await getRegistrationAsPartner(id, userId);
  if (registration.partnerConfirmedAt) {
    throw new ApiError(409, "You have already confirmed this pairing");
  }
  return prisma.registration.update({
    where: { id },
    data: { partnerConfirmedAt: new Date() },
  });
}

export async function declinePartner(id: string, userId: string) {
  await getRegistrationAsPartner(id, userId);
  return prisma.registration.update({
    where: { id },
    data: { status: "REJECTED", reviewedAt: new Date() },
  });
}

export async function reviewRegistration(id: string, status: "APPROVED" | "REJECTED", reviewerId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { category: true, tournament: true, player: true },
  });
  if (!registration) {
    throw new ApiError(404, "Registration not found");
  }
  if (registration.status !== "PENDING") {
    throw new ApiError(409, "This registration has already been reviewed");
  }
  if (status === "APPROVED" && registration.category?.type === "DOUBLES" && !registration.partnerConfirmedAt) {
    throw new ApiError(409, "The partner has not confirmed this pairing yet");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.registration.update({
      where: { id },
      data: { status, reviewedById: reviewerId, reviewedAt: new Date() },
    });

    if (status === "APPROVED" && registration.playerId && registration.categoryId) {
      if (registration.category?.type === "SINGLES") {
        const existingEntry = await tx.categoryEntry.findFirst({
          where: { categoryId: registration.categoryId, player1Id: registration.playerId, player2Id: null },
        });
        if (!existingEntry) {
          await tx.categoryEntry.create({
            data: { categoryId: registration.categoryId, player1Id: registration.playerId },
          });
        }
      } else if (registration.category?.type === "DOUBLES" && registration.partnerPlayerId) {
        const existingEntry = await tx.categoryEntry.findFirst({
          where: {
            categoryId: registration.categoryId,
            OR: [
              { player1Id: registration.playerId, player2Id: registration.partnerPlayerId },
              { player1Id: registration.partnerPlayerId, player2Id: registration.playerId },
            ],
          },
        });
        if (!existingEntry) {
          await tx.categoryEntry.create({
            data: {
              categoryId: registration.categoryId,
              player1Id: registration.playerId,
              player2Id: registration.partnerPlayerId,
            },
          });
        }
      }
    }

    return updated;
  });

  if (registration.player?.userId) {
    const categoryName = registration.category?.name ?? "your category";
    const tournamentName = registration.tournament?.name ?? "the tournament";
    if (status === "APPROVED") {
      await createNotification({
        userId: registration.player.userId,
        type: "REGISTRATION_APPROVED",
        title: "Application Approved",
        body: `Your entry for ${categoryName} in ${tournamentName} has been approved.`,
        data: { registrationId: id },
      });
    } else {
      await createNotification({
        userId: registration.player.userId,
        type: "REGISTRATION_REJECTED",
        title: "Application Rejected",
        body: `Your entry for ${categoryName} in ${tournamentName} was not approved.`,
        data: { registrationId: id },
      });
    }
  }

  return result;
}

export async function createPayment(registrationId: string, input: CreatePaymentInput) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { payment: true },
  });
  if (!registration) {
    throw new ApiError(404, "Registration not found");
  }
  if (registration.payment) {
    throw new ApiError(409, "This registration already has a payment record");
  }

  return prisma.payment.create({
    data: {
      registrationId,
      amount: input.amount,
      currency: input.currency ?? "PKR",
      method: input.method ?? "MANUAL",
    },
  });
}

export async function updatePayment(registrationId: string, input: UpdatePaymentInput) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { payment: true },
  });
  if (!registration || !registration.payment) {
    throw new ApiError(404, "No payment record exists for this registration");
  }

  return prisma.payment.update({
    where: { registrationId },
    data: {
      status: input.status,
      transactionRef: input.transactionRef,
      paidAt: input.status === "PAID" ? new Date() : registration.payment.paidAt,
    },
  });
}
