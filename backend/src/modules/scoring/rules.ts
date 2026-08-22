export interface ScoringConfig {
  pointsPerGame: number;
  bestOf: 1 | 3 | 5;
  capAt: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = { pointsPerGame: 21, bestOf: 3, capAt: 30 };

// Tournament.scoringConfig is an untyped Json column — parse defensively and
// fall back to BWF defaults for anything missing or malformed.
export function parseScoringConfig(raw: unknown): ScoringConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_SCORING_CONFIG;
  }
  const obj = raw as Record<string, unknown>;
  const bestOf = obj.bestOf === 1 || obj.bestOf === 3 || obj.bestOf === 5 ? obj.bestOf : DEFAULT_SCORING_CONFIG.bestOf;
  return {
    pointsPerGame: typeof obj.pointsPerGame === "number" ? obj.pointsPerGame : DEFAULT_SCORING_CONFIG.pointsPerGame,
    bestOf,
    capAt: typeof obj.capAt === "number" ? obj.capAt : DEFAULT_SCORING_CONFIG.capAt,
  };
}

export function gamesToWinMatch(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}

export interface GameOutcome {
  isOver: boolean;
  winner?: "ENTRY1" | "ENTRY2";
}

// Rally-point scoring: win by reaching pointsPerGame with a 2-point lead, or
// by reaching the hard cap outright (e.g. 30-29 ends it even without a
// 2-point margin — the standard badminton "sudden death at 29-29" rule).
export function evaluateGame(entry1Score: number, entry2Score: number, config: ScoringConfig): GameOutcome {
  const max = Math.max(entry1Score, entry2Score);
  const min = Math.min(entry1Score, entry2Score);

  if (max >= config.capAt) {
    return { isOver: true, winner: entry1Score > entry2Score ? "ENTRY1" : "ENTRY2" };
  }
  if (max >= config.pointsPerGame && max - min >= 2) {
    return { isOver: true, winner: entry1Score > entry2Score ? "ENTRY1" : "ENTRY2" };
  }
  return { isOver: false };
}
