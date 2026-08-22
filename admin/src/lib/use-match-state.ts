"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useApiClient } from "./auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface EntryPlayer {
  id: string;
  fullName: string;
}
export interface Entry {
  id: string;
  player1: EntryPlayer;
  player2: EntryPlayer | null;
}
export interface MatchGame {
  id: string;
  gameNumber: number;
  entry1Score: number;
  entry2Score: number;
  winnerEntryId: string | null;
  completedAt: string | null;
}
export interface ScoringConfig {
  pointsPerGame: number;
  bestOf: number;
  capAt: number;
}
export interface MatchScoringState {
  matchId: string;
  status: string;
  entry1Id: string | null;
  entry2Id: string | null;
  entry1: Entry | null;
  entry2: Entry | null;
  winnerEntryId: string | null;
  config: ScoringConfig;
  games: MatchGame[];
  currentGame: MatchGame | null;
  gamesWon: { entry1: number; entry2: number };
  isPaused: boolean;
}

// Initial state comes from REST; the socket keeps it live afterwards. Writes
// (point/undo/pause/etc.) still go through the REST endpoints — the socket
// is broadcast-only, so this hook never sends scoring commands itself.
export function useMatchState(matchId: string) {
  const api = useApiClient();
  const [state, setState] = useState<MatchScoringState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;

    api<MatchScoringState>(`/api/matches/${matchId}/scoring`)
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load match state.");
      });

    const socket = io(API_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("match:join", matchId));
    socket.on("match:state", (s: MatchScoringState) => {
      if (!cancelled) setState(s);
    });

    return () => {
      cancelled = true;
      socket.emit("match:leave", matchId);
      socket.disconnect();
    };
  }, [api, matchId]);

  return { state, error };
}
