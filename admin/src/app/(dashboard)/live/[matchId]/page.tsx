"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { useMatchState, type Entry } from "@/lib/use-match-state";
import { ApiError } from "@/lib/api";

const OFFICIATE_ROLES = ["super_admin", "tournament_admin", "referee"];

function entryLabel(entry: Entry | null): string {
  if (!entry) return "TBD";
  return entry.player2 ? `${entry.player1.fullName} / ${entry.player2.fullName}` : entry.player1.fullName;
}

export default function LiveMatchPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const api = useApiClient();
  const { user } = useAuth();
  const { state, error } = useMatchState(matchId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canOfficiate = !!user && OFFICIATE_ROLES.includes(user.role);

  async function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-red-400">{error}</p>;
  if (!state) return <p className="text-slate-400">Loading…</p>;

  const entry1Label = entryLabel(state.entry1);
  const entry2Label = entryLabel(state.entry2);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Live Scoring</h1>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase text-slate-300">{state.status}</span>
      </div>

      {actionError && <p className="mb-4 rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{actionError}</p>}

      <div className="grid grid-cols-2 gap-4">
        <ScoreCard
          label={entry1Label}
          score={state.currentGame?.entry1Score ?? 0}
          gamesWon={state.gamesWon.entry1}
          isWinner={state.winnerEntryId === state.entry1Id}
        />
        <ScoreCard
          label={entry2Label}
          score={state.currentGame?.entry2Score ?? 0}
          gamesWon={state.gamesWon.entry2}
          isWinner={state.winnerEntryId === state.entry2Id}
        />
      </div>

      {state.games.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-2 text-sm text-slate-400">Games</p>
          <div className="flex gap-4">
            {state.games.map((g) => (
              <div key={g.id} className="text-sm text-slate-300">
                G{g.gameNumber}: {g.entry1Score}-{g.entry2Score}
              </div>
            ))}
          </div>
        </div>
      )}

      {!canOfficiate && state.status !== "COMPLETED" && (
        <p className="mt-8 text-center text-sm text-slate-500">Live view only — you don&apos;t have scoring access for this match.</p>
      )}

      {canOfficiate && state.status !== "COMPLETED" && (
        <div className="mt-8 space-y-4">
          {state.status !== "LIVE" ? (
            <button
              disabled={busy}
              onClick={() => runAction(() => api(`/api/matches/${matchId}/scoring/start`, { method: "POST" }))}
              className="w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Start Match
            </button>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={busy || state.isPaused}
                  onClick={() =>
                    runAction(() =>
                      api(`/api/matches/${matchId}/scoring/point`, {
                        method: "POST",
                        body: { entryId: state.entry1Id },
                      }),
                    )
                  }
                  className="rounded-md bg-sky-600 px-4 py-4 text-lg font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  +1 {entry1Label}
                </button>
                <button
                  disabled={busy || state.isPaused}
                  onClick={() =>
                    runAction(() =>
                      api(`/api/matches/${matchId}/scoring/point`, {
                        method: "POST",
                        body: { entryId: state.entry2Id },
                      }),
                    )
                  }
                  className="rounded-md bg-sky-600 px-4 py-4 text-lg font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  +1 {entry2Label}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={busy}
                  onClick={() => runAction(() => api(`/api/matches/${matchId}/scoring/undo`, { method: "POST" }))}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  Undo
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    runAction(() =>
                      api(`/api/matches/${matchId}/scoring/${state.isPaused ? "resume" : "pause"}`, {
                        method: "POST",
                      }),
                    )
                  }
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  {state.isPaused ? "Resume" : "Pause"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {state.status === "COMPLETED" && (
        <p className="mt-8 rounded-md bg-emerald-950 px-4 py-3 text-center text-sm text-emerald-300">
          Match complete — winner: {state.winnerEntryId === state.entry1Id ? entry1Label : entry2Label}
        </p>
      )}
    </div>
  );
}

function ScoreCard({
  label,
  score,
  gamesWon,
  isWinner,
}: {
  label: string;
  score: number;
  gamesWon: number;
  isWinner: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 text-center ${
        isWinner ? "border-emerald-500 bg-emerald-950/40" : "border-slate-800 bg-slate-900"
      }`}
    >
      <p className="truncate text-sm text-slate-300">{label}</p>
      <p className="mt-2 text-5xl font-bold text-white">{score}</p>
      <p className="mt-1 text-xs text-slate-500">
        {gamesWon} game{gamesWon === 1 ? "" : "s"} won
      </p>
    </div>
  );
}
