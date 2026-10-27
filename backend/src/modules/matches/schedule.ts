import type { AutoScheduleInput } from "./matches.validation";

export interface SchedulableMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: string;
}

export interface ScheduleAssignment {
  matchId: string;
  courtId: string;
  scheduledDate: Date;
  scheduledTime: string; // HH:MM
}

function parseHm(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function formatHm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function dateOnlyUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Pack matches onto courts in parallel time slots, round by round.
 * Later rounds start after earlier rounds finish (knockout-safe estimate).
 */
export function planAutoSchedule(
  matches: SchedulableMatch[],
  courtIds: string[],
  options: Required<
    Pick<AutoScheduleInput, "startTime" | "matchDurationMinutes" | "breakMinutes" | "dayEndTime">
  > & { startDate: Date },
): ScheduleAssignment[] {
  if (courtIds.length === 0) {
    return [];
  }

  const playable = matches
    .filter((m) => m.status === "SCHEDULED" || m.status === "STARTING_SOON" || m.status === "POSTPONED")
    .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber);

  const byRound = new Map<number, SchedulableMatch[]>();
  for (const m of playable) {
    const list = byRound.get(m.round) ?? [];
    list.push(m);
    byRound.set(m.round, list);
  }

  const startMinutes = parseHm(options.startTime);
  const dayEndMinutes = parseHm(options.dayEndTime);
  const slotSpan = options.matchDurationMinutes + options.breakMinutes;

  let day = dateOnlyUtc(options.startDate);
  let cursor = startMinutes;
  const assignments: ScheduleAssignment[] = [];

  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  for (const round of rounds) {
    const roundMatches = byRound.get(round) ?? [];
    // Start each new round on a fresh morning slot if the previous round
    // already filled the day — otherwise continue the same day.
    if (cursor >= dayEndMinutes) {
      day = addDays(day, 1);
      cursor = startMinutes;
    }

    for (let i = 0; i < roundMatches.length; i += courtIds.length) {
      if (cursor + options.matchDurationMinutes > dayEndMinutes) {
        day = addDays(day, 1);
        cursor = startMinutes;
      }

      const batch = roundMatches.slice(i, i + courtIds.length);
      const time = formatHm(cursor);
      batch.forEach((match, index) => {
        assignments.push({
          matchId: match.id,
          courtId: courtIds[index],
          scheduledDate: day,
          scheduledTime: time,
        });
      });
      cursor += slotSpan;
    }
  }

  return assignments;
}
