import { Match, Player, Round, Tournament } from './types';

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Standard single-elimination seeding order for a bracket of the given size (power of 2). */
function seedOrder(size: number): number[] {
  if (size === 1) return [1];
  const prev = seedOrder(size / 2);
  const result: number[] = [];
  for (const s of prev) {
    result.push(s, size + 1 - s);
  }
  return result;
}

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/**
 * Builds a single-elimination bracket from an ordered list of players.
 * Byes are given to the lowest seeds and auto-advanced immediately, so
 * the first playable round may already have round-2 slots pre-filled.
 */
export function generateBracket(players: Player[]): Round[] {
  const bracketSize = nextPowerOfTwo(players.length);
  const totalRounds = Math.log2(bracketSize);
  const order = seedOrder(bracketSize);
  const bySeed = new Map<number, Player>(players.map((p) => [p.seed, p]));

  const rounds: Round[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    const matchCount = bracketSize / 2 ** r;
    const matches: Match[] = Array.from({ length: matchCount }, (_, slot) => ({
      id: generateId(),
      round: r,
      slot,
      player1Id: null,
      player2Id: null,
      winnerId: null,
    }));
    rounds.push({ round: r, matches });
  }

  const firstRound = rounds[0];
  for (let i = 0; i < firstRound.matches.length; i++) {
    const seed1 = order[i * 2];
    const seed2 = order[i * 2 + 1];
    firstRound.matches[i].player1Id = bySeed.get(seed1)?.id ?? null;
    firstRound.matches[i].player2Id = bySeed.get(seed2)?.id ?? null;
  }

  // Auto-advance byes. This only ever happens in round 1: a match there has
  // exactly one player when the bracket was padded to a power of two. Later
  // rounds always end up with two real contenders (either from real matches
  // or from bye winners), so they must never be auto-decided here.
  for (const match of firstRound.matches) {
    const hasP1 = match.player1Id !== null;
    const hasP2 = match.player2Id !== null;
    if (hasP1 !== hasP2) {
      match.winnerId = hasP1 ? match.player1Id : match.player2Id;
      placeWinnerInNextRound(rounds, match);
    }
  }

  return rounds;
}

function placeWinnerInNextRound(rounds: Round[], match: Match): void {
  const nextRound = rounds[match.round]; // rounds is 0-indexed, match.round is 1-indexed
  if (!nextRound) return;
  const nextMatch = nextRound.matches[Math.floor(match.slot / 2)];
  if (match.slot % 2 === 0) {
    nextMatch.player1Id = match.winnerId;
  } else {
    nextMatch.player2Id = match.winnerId;
  }
}

/**
 * Records a winner for a match and propagates them into the next round.
 * Returns a new Tournament with updated rounds/status (does not mutate the input).
 */
export function advanceWinner(tournament: Tournament, matchId: string, winnerId: string): Tournament {
  const rounds = tournament.rounds.map((round) => ({
    round: round.round,
    matches: round.matches.map((m) => ({ ...m })),
  }));

  let target: Match | undefined;
  for (const round of rounds) {
    target = round.matches.find((m) => m.id === matchId);
    if (target) break;
  }
  if (!target || target.player1Id === null || target.player2Id === null) {
    return tournament;
  }
  if (winnerId !== target.player1Id && winnerId !== target.player2Id) {
    return tournament;
  }

  target.winnerId = winnerId;
  placeWinnerInNextRound(rounds, target);

  const isFinal = target.round === rounds.length;
  const championId = isFinal ? winnerId : tournament.championId;
  const status = isFinal ? 'completed' : tournament.status;

  return { ...tournament, rounds, championId, status };
}
