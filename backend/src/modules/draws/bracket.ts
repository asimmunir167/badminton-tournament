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
