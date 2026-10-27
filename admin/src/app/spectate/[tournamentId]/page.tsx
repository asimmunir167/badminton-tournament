"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Tournament {
  id: string;
  name: string;
  venue: string;
  startDate: string;
  endDate: string;
  status: string;
  format: string;
  categories: { id: string; name: string }[];
}

interface EntryPlayer {
  fullName: string;
}
interface Entry {
  player1?: EntryPlayer;
  player2?: EntryPlayer | null;
}
interface Match {
  id: string;
  round: number;
  matchNumber: number;
  status: string;
  scheduledTime: string | null;
  category: { name: string };
  court: { name: string } | null;
  entry1: Entry | null;
  entry2: Entry | null;
  games: { gameNumber: number; entry1Score: number; entry2Score: number }[];
}

function entryLabel(entry: Entry | null): string {
  if (!entry?.player1) return "TBD";
  return entry.player2?.fullName
    ? `${entry.player1.fullName} / ${entry.player2.fullName}`
    : entry.player1.fullName;
}

export default function SpectatorPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [live, setLive] = useState<Match[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tab, setTab] = useState<"live" | "fixtures">("live");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [t, l, m] = await Promise.all([
          fetch(`${API_URL}/api/public/tournaments/${tournamentId}`).then((r) => r.json()),
          fetch(`${API_URL}/api/public/tournaments/${tournamentId}/live`).then((r) => r.json()),
          fetch(`${API_URL}/api/public/tournaments/${tournamentId}/matches`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (t.error) throw new Error(t.error);
        setTournament(t);
        setLive(Array.isArray(l) ? l : []);
        setMatches(Array.isArray(m) ? m : []);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not load spectator board.");
      }
    }
    load();
    const id = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tournamentId]);

  const upcoming = useMemo(
    () => matches.filter((m) => m.status === "SCHEDULED" || m.status === "STARTING_SOON").slice(0, 40),
    [matches],
  );

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-red-400">
        {error}
      </main>
    );
  }
  if (!tournament) {
    return <main className="min-h-screen bg-slate-950 p-6 text-slate-400">Loading spectator board…</main>;
  }

  const list = tab === "live" ? live : upcoming;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm uppercase tracking-widest text-sky-400">Live spectator</p>
        <h1 className="mt-2 text-3xl font-semibold">{tournament.name}</h1>
        <p className="mt-1 text-slate-400">
          {tournament.venue} · {tournament.status} · refreshes every 8s
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("live")}
            className={`rounded-md px-4 py-2 text-sm ${tab === "live" ? "bg-sky-600" : "bg-slate-800"}`}
          >
            Live / Starting ({live.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("fixtures")}
            className={`rounded-md px-4 py-2 text-sm ${tab === "fixtures" ? "bg-sky-600" : "bg-slate-800"}`}
          >
            Upcoming
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {list.length === 0 && (
            <p className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-slate-400">
              No matches in this view yet.
            </p>
          )}
          {list.map((m) => {
            const lastGame = m.games?.[m.games.length - 1];
            return (
              <article key={m.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                  <span>
                    {m.category.name} · R{m.round} · #{m.matchNumber}
                  </span>
                  <span className="uppercase text-sky-300">{m.status.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-2 text-lg font-medium">
                  {entryLabel(m.entry1)} <span className="text-slate-500">vs</span> {entryLabel(m.entry2)}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {m.scheduledTime ?? "Time TBD"}
                  {m.court ? ` · ${m.court.name}` : ""}
                  {lastGame ? ` · Game ${lastGame.gameNumber}: ${lastGame.entry1Score}–${lastGame.entry2Score}` : ""}
                </p>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Share link: /spectate/{tournamentId}
        </p>
      </div>
    </main>
  );
}
