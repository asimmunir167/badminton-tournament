import { prisma } from "../../lib/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { createNotification } from "../notifications/notifications.service";

async function userIdsForEntry(entryId: string | null): Promise<string[]> {
  if (!entryId) return [];
  const entry = await prisma.categoryEntry.findUnique({
    where: { id: entryId },
    include: {
      player1: { select: { userId: true } },
      player2: { select: { userId: true } },
    },
  });
  if (!entry) return [];
  return [entry.player1.userId, entry.player2?.userId].filter((id): id is string => Boolean(id));
}

function matchClock(scheduledDate: Date, scheduledTime: string): Date {
  const [hh, mm] = scheduledTime.split(":").map(Number);
  const d = new Date(scheduledDate);
  d.setUTCHours(hh || 0, mm || 0, 0, 0);
  return d;
}

/** Mark matches in the next N minutes as STARTING_SOON and notify players. */
export async function sendStartingSoonReminders(tournamentId: string, withinMinutes = 45) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    throw new ApiError(404, "Tournament not found");
  }

  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      status: "SCHEDULED",
      scheduledDate: { not: null },
      scheduledTime: { not: null },
      entry1Id: { not: null },
      entry2Id: { not: null },
    },
    include: {
      court: true,
      category: { select: { name: true } },
      entry1: { include: { player1: true, player2: true } },
      entry2: { include: { player1: true, player2: true } },
    },
  });

  const now = Date.now();
  const windowMs = withinMinutes * 60 * 1000;
  let notified = 0;

  for (const match of matches) {
    if (!match.scheduledDate || !match.scheduledTime) continue;
    const when = matchClock(match.scheduledDate, match.scheduledTime).getTime();
    if (when < now || when > now + windowMs) continue;

    await prisma.match.update({ where: { id: match.id }, data: { status: "STARTING_SOON" } });

    const userIds = [
      ...(await userIdsForEntry(match.entry1Id)),
      ...(await userIdsForEntry(match.entry2Id)),
    ];
    const courtLabel = match.court?.name ? ` on ${match.court.name}` : "";
    const title = "Your match is starting soon";
    const body = `${match.category.name} · Round ${match.round} at ${match.scheduledTime}${courtLabel}`;

    for (const userId of [...new Set(userIds)]) {
      await createNotification({
        userId,
        type: "MATCH_STARTING_SOON",
        title,
        body,
        data: { matchId: match.id, tournamentId },
      });
      notified += 1;
    }
  }

  return { matchesMarked: matches.length, notificationsSent: notified, withinMinutes };
}

export async function notifyMatchScheduled(tournamentId: string) {
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      status: "SCHEDULED",
      scheduledDate: { not: null },
      scheduledTime: { not: null },
    },
    include: { court: true, category: { select: { name: true } } },
  });

  let count = 0;
  for (const match of matches) {
    const userIds = [
      ...(await userIdsForEntry(match.entry1Id)),
      ...(await userIdsForEntry(match.entry2Id)),
    ];
    const courtLabel = match.court?.name ? ` · ${match.court.name}` : "";
    for (const userId of [...new Set(userIds)]) {
      await createNotification({
        userId,
        type: "MATCH_SCHEDULED",
        title: "Match scheduled",
        body: `${match.category.name} R${match.round} at ${match.scheduledTime}${courtLabel}`,
        data: { matchId: match.id, tournamentId },
      });
      count += 1;
    }
  }
  return { notificationsSent: count };
}
