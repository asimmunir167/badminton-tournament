export interface SeedableEntry {
  id: string;
  seed: number | null;
  createdAt: Date;
}

export interface PlannedMatch {
  id: string;
  round: number;
  matchNumber: number;
  entry1Id: string | null;
  entry2Id: string | null;
  winnerEntryId: string | null;
  status: "SCHEDULED" | "COMPLETED";
  nextMatchId: string | null;
  nextMatchSlot: number | null;
  tehsilId?: string | null;
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) {
    p *= 2;
  }
  return p;
}

// Standard "avoid top seeds meeting early" bracket seeding order. For size=8
// this yields [1,8,4,5,2,7,3,6], i.e. pairs (1v8)(4v5)(2v7)(3v6) in round 1.
export function seedOrder(size: number): number[] {
  if (size < 2) {
    return [1];
  }
  let order = [1, 2];
  while (order.length < size) {
    const m = order.length * 2 + 1;
    const next: number[] = [];
    for (const s of order) {
      next.push(s, m - s);
    }
    order = next;
  }
  return order;
}

function sortBySeed(entries: SeedableEntry[]): SeedableEntry[] {
  return [...entries].sort((a, b) => {
    const as = a.seed ?? Number.MAX_SAFE_INTEGER;
    const bs = b.seed ?? Number.MAX_SAFE_INTEGER;
    if (as !== bs) {
      return as - bs;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

// Single-elimination bracket with byes for non-power-of-two entry counts.
// A first-round bye auto-completes that match immediately; the bracket is
// built so a bye can only ever resolve one round ahead (never cascades
// deeper), since bracketSize is always the *smallest* power of two >= n.
export function planKnockoutBracket(entries: SeedableEntry[], makeId: () => string): PlannedMatch[] {
  if (entries.length < 2) {
    throw new Error("A knockout draw needs at least 2 entries");
  }

  const sorted = sortBySeed(entries);
  const bracketSize = nextPowerOfTwo(sorted.length);
  const order = seedOrder(bracketSize);
  const slots: (SeedableEntry | null)[] = order.map((seedNum) => sorted[seedNum - 1] ?? null);

  type Node = PlannedMatch & { autoWinnerEntryId: string | null };

  const round1: Node[] = [];
  for (let i = 0; i < bracketSize / 2; i += 1) {
    const e1 = slots[2 * i];
    const e2 = slots[2 * i + 1];
    const autoWinnerEntryId = e1 && !e2 ? e1.id : e2 && !e1 ? e2.id : null;
    round1.push({
      id: makeId(),
      round: 1,
      matchNumber: i + 1,
      entry1Id: e1?.id ?? null,
      entry2Id: e2?.id ?? null,
      winnerEntryId: autoWinnerEntryId,
      status: autoWinnerEntryId ? "COMPLETED" : "SCHEDULED",
      nextMatchId: null,
      nextMatchSlot: null,
      autoWinnerEntryId,
    });
  }

  const rounds: Node[][] = [round1];
  const totalRounds = Math.log2(bracketSize);

  for (let r = 2; r <= totalRounds; r += 1) {
    const prevRound = rounds[r - 2];
    const roundMatches: Node[] = [];
    for (let i = 0; i < prevRound.length / 2; i += 1) {
      const feeder1 = prevRound[2 * i];
      const feeder2 = prevRound[2 * i + 1];
      const match: Node = {
        id: makeId(),
        round: r,
        matchNumber: i + 1,
        entry1Id: feeder1.autoWinnerEntryId,
        entry2Id: feeder2.autoWinnerEntryId,
        winnerEntryId: null,
        status: "SCHEDULED",
        nextMatchId: null,
        nextMatchSlot: null,
        autoWinnerEntryId: null,
      };
      feeder1.nextMatchId = match.id;
      feeder1.nextMatchSlot = 0;
      feeder2.nextMatchId = match.id;
      feeder2.nextMatchSlot = 1;
      roundMatches.push(match);
    }
    rounds.push(roundMatches);
  }

  return rounds.flat().map(({ autoWinnerEntryId: _autoWinnerEntryId, ...match }) => match);
}

// Circle method round robin. Pads with a bye (null) for odd entry counts;
// matches against the bye slot are simply skipped, not created.
export function planRoundRobin(entries: SeedableEntry[], makeId: () => string): PlannedMatch[] {
  if (entries.length < 2) {
    throw new Error("A round-robin draw needs at least 2 entries");
  }

  const sorted = sortBySeed(entries);
  const ids: (string | null)[] = sorted.map((e) => e.id);
  if (ids.length % 2 === 1) {
    ids.push(null);
  }

  const n = ids.length;
  const totalRounds = n - 1;
  const half = n / 2;
  const matches: PlannedMatch[] = [];
  let matchNumber = 1;

  const circle = [...ids];
  for (let round = 1; round <= totalRounds; round += 1) {
    for (let i = 0; i < half; i += 1) {
      const a = circle[i];
      const b = circle[n - 1 - i];
      if (a !== null && b !== null) {
        matches.push({
          id: makeId(),
          round,
          matchNumber: matchNumber++,
          entry1Id: a,
          entry2Id: b,
          winnerEntryId: null,
          status: "SCHEDULED",
          nextMatchId: null,
          nextMatchSlot: null,
        });
      }
    }
    const fixed = circle[0];
    const rest = circle.slice(1);
    rest.unshift(rest.pop() as string | null);
    circle.splice(0, circle.length, fixed, ...rest);
  }

  return matches;
}

/** Knockout rounds for GROUP_KNOCKOUT start at this base so group rounds (1..N) stay separate. */
export const KO_ROUND_BASE = 100;

/**
 * Split seeded entries into groups and create round-robin matches inside each group.
 * `round` on each match = group number (1-based). Knockout is created later via advance.
 */
export function planGroupStage(
  entries: SeedableEntry[],
  makeId: () => string,
  targetGroupSize = 4,
): PlannedMatch[] {
  if (entries.length < 4) {
    throw new Error("Group + Knockout needs at least 4 entries");
  }

  const sorted = sortBySeed(entries);
  const groupCount = Math.max(2, Math.ceil(sorted.length / targetGroupSize));
  const groups: SeedableEntry[][] = Array.from({ length: groupCount }, () => []);

  // Snake distribution so top seeds land in different groups.
  let direction = 1;
  let g = 0;
  for (const entry of sorted) {
    groups[g].push(entry);
    g += direction;
    if (g >= groupCount || g < 0) {
      direction *= -1;
      g += direction;
    }
  }

  const usable = groups.filter((grp) => grp.length >= 2);
  if (usable.length < 2) {
    throw new Error("Could not form at least 2 groups with 2+ entries each");
  }

  const matches: PlannedMatch[] = [];
  let matchNumber = 1;
  usable.forEach((grp, index) => {
    const rr = planRoundRobin(grp, makeId);
    for (const m of rr) {
      matches.push({
        ...m,
        round: index + 1,
        matchNumber: matchNumber++,
        nextMatchId: null,
        nextMatchSlot: null,
      });
    }
  });

  return matches;
}

export function remapKnockoutRounds(matches: PlannedMatch[], roundBase = KO_ROUND_BASE): PlannedMatch[] {
  return matches.map((m) => ({ ...m, round: roundBase + m.round - 1 }));
}

export interface TehsilSeedableEntry extends SeedableEntry {
  tehsilId: string;
}

/** One knockout bracket per tehsil — tehsil winners advance to district knockout later. */
export function planTehsilKnockoutStage(
  entries: TehsilSeedableEntry[],
  makeId: () => string,
): PlannedMatch[] {
  if (entries.length < 2) {
    throw new Error("Tehsil knockout needs at least 2 entries");
  }

  const byTehsil = new Map<string, TehsilSeedableEntry[]>();
  for (const entry of entries) {
    if (!entry.tehsilId) {
      throw new Error("Every entry must have a tehsil for tehsil-wise draws");
    }
    const list = byTehsil.get(entry.tehsilId) ?? [];
    list.push(entry);
    byTehsil.set(entry.tehsilId, list);
  }

  const matches: PlannedMatch[] = [];
  let matchNumber = 1;

  for (const [tehsilId, tehsilEntries] of byTehsil) {
    if (tehsilEntries.length < 2) {
      continue;
    }
    const bracket = planKnockoutBracket(tehsilEntries, makeId);
    for (const m of bracket) {
      matches.push({ ...m, tehsilId, matchNumber: matchNumber++ });
    }
  }

  if (matches.length === 0) {
    throw new Error("Need at least 2 entries in the same tehsil to start tehsil-wise matches");
  }

  return matches;
}
