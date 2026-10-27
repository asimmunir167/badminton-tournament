import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";

function parseAmount(value: { toString(): string } | string | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value.toString());
}

export async function getGlobalOpsStats() {
  const [tournaments, districts, players, liveMatches, pendingRegs, pendingPayments] = await Promise.all([
    prisma.tournament.count(),
    prisma.district.count(),
    prisma.player.count(),
    prisma.match.count({ where: { status: "LIVE" } }),
    prisma.registration.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
  ]);

  const paid = await prisma.payment.findMany({ where: { status: "PAID" }, select: { amount: true } });
  const feesCollected = paid.reduce((sum, p) => sum + parseAmount(p.amount), 0);

  return {
    totalTournaments: tournaments,
    totalDistricts: districts,
    totalPlayers: players,
    liveMatches,
    pendingRegistrations: pendingRegs,
    pendingPayments,
    feesCollectedPkr: Math.round(feesCollected),
  };
}

export async function getTournamentOps(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  const [registrations, payments, matches, courts] = await Promise.all([
    prisma.registration.findMany({
      where: { tournamentId },
      include: { payment: true, category: { select: { entryFee: true, name: true } } },
    }),
    prisma.payment.findMany({
      where: { registration: { tournamentId } },
    }),
    prisma.match.findMany({
      where: { tournamentId },
      include: { court: true, category: { select: { name: true } } },
    }),
    prisma.court.findMany({ where: { tournamentId } }),
  ]);

  const feesExpected = registrations.reduce((sum, r) => sum + parseAmount(r.category?.entryFee), 0);
  const feesCollected = payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + parseAmount(p.amount), 0);
  const feesPending = payments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + parseAmount(p.amount), 0);

  const now = Date.now();
  const delayed = matches.filter((m) => {
    if (m.status === "COMPLETED" || m.status === "LIVE" || !m.scheduledDate || !m.scheduledTime) return false;
    const [hh, mm] = m.scheduledTime.split(":").map(Number);
    const scheduled = new Date(m.scheduledDate);
    scheduled.setUTCHours(hh || 0, mm || 0, 0, 0);
    return scheduled.getTime() < now - 15 * 60 * 1000 && (m.status === "SCHEDULED" || m.status === "STARTING_SOON");
  });

  const courtUtilization = courts.map((c) => {
    const courtMatches = matches.filter((m) => m.courtId === c.id);
    return {
      courtId: c.id,
      name: c.name,
      status: c.status,
      totalAssigned: courtMatches.length,
      live: courtMatches.filter((m) => m.status === "LIVE").length,
      completed: courtMatches.filter((m) => m.status === "COMPLETED").length,
    };
  });

  return {
    tournamentId,
    name: tournament.name,
    status: tournament.status,
    registrations: {
      total: registrations.length,
      pending: registrations.filter((r) => r.status === "PENDING").length,
      approved: registrations.filter((r) => r.status === "APPROVED").length,
      rejected: registrations.filter((r) => r.status === "REJECTED").length,
    },
    fees: {
      expectedPkr: Math.round(feesExpected),
      collectedPkr: Math.round(feesCollected),
      pendingPkr: Math.round(feesPending),
      unpaidCount: payments.filter((p) => p.status === "PENDING").length,
    },
    matches: {
      total: matches.length,
      live: matches.filter((m) => m.status === "LIVE").length,
      completed: matches.filter((m) => m.status === "COMPLETED").length,
      upcoming: matches.filter((m) => m.status === "SCHEDULED" || m.status === "STARTING_SOON").length,
      delayed: delayed.length,
      delayedMatches: delayed.slice(0, 20).map((m) => ({
        id: m.id,
        category: m.category.name,
        round: m.round,
        matchNumber: m.matchNumber,
        scheduledTime: m.scheduledTime,
        court: m.court?.name ?? null,
      })),
    },
    courts: courtUtilization,
  };
}

export async function exportRegistrationsCsv(tournamentId: string): Promise<string> {
  const regs = await prisma.registration.findMany({
    where: { tournamentId },
    include: {
      player: { select: { fullName: true, phone: true } },
      category: { select: { name: true, entryFee: true } },
      payment: true,
    },
    orderBy: { submittedAt: "asc" },
  });

  const header = [
    "player",
    "phone",
    "category",
    "entry_fee",
    "registration_status",
    "payment_status",
    "payment_method",
    "transaction_ref",
    "amount",
    "submitted_at",
  ];
  const lines = [header.join(",")];
  for (const r of regs) {
    const row = [
      csv(r.player?.fullName),
      csv(r.player?.phone),
      csv(r.category?.name),
      csv(r.category?.entryFee?.toString()),
      csv(r.status),
      csv(r.payment?.status),
      csv(r.payment?.method),
      csv(r.payment?.transactionRef),
      csv(r.payment?.amount?.toString()),
      csv(r.submittedAt.toISOString()),
    ];
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

function csv(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
