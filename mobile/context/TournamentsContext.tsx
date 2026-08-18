import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { advanceWinner, generateBracket, generateId } from '../lib/bracket';
import { loadTournaments, saveTournaments } from '../lib/storage';
import { Player, Tournament } from '../lib/types';

interface TournamentsContextValue {
  tournaments: Tournament[];
  loading: boolean;
  createTournament: (name: string, playerNames: string[]) => Tournament;
  deleteTournament: (id: string) => void;
  recordWinner: (tournamentId: string, matchId: string, winnerId: string) => void;
}

const TournamentsContext = createContext<TournamentsContextValue | undefined>(undefined);

export function TournamentsProvider({ children }: { children: React.ReactNode }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments().then((loaded) => {
      setTournaments(loaded);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      saveTournaments(tournaments);
    }
  }, [tournaments, loading]);

  const createTournament = (name: string, playerNames: string[]): Tournament => {
    const players: Player[] = playerNames.map((playerName, index) => ({
      id: generateId(),
      name: playerName,
      seed: index + 1,
    }));
    const tournament: Tournament = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      players,
      rounds: generateBracket(players),
      status: 'active',
      championId: null,
    };
    setTournaments((prev) => [tournament, ...prev]);
    return tournament;
  };

  const deleteTournament = (id: string) => {
    setTournaments((prev) => prev.filter((t) => t.id !== id));
  };

  const recordWinner = (tournamentId: string, matchId: string, winnerId: string) => {
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? advanceWinner(t, matchId, winnerId) : t))
    );
  };

  const value = useMemo(
    () => ({ tournaments, loading, createTournament, deleteTournament, recordWinner }),
    [tournaments, loading]
  );

  return <TournamentsContext.Provider value={value}>{children}</TournamentsContext.Provider>;
}

export function useTournaments(): TournamentsContextValue {
  const ctx = useContext(TournamentsContext);
  if (!ctx) throw new Error('useTournaments must be used within a TournamentsProvider');
  return ctx;
}
