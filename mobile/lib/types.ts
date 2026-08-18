export interface Player {
  id: string;
  name: string;
  seed: number;
}

export interface Match {
  id: string;
  round: number;
  slot: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
}

export interface Round {
  round: number;
  matches: Match[];
}

export type TournamentStatus = 'active' | 'completed';

export interface Tournament {
  id: string;
  name: string;
  createdAt: number;
  players: Player[];
  rounds: Round[];
  status: TournamentStatus;
  championId: string | null;
}
