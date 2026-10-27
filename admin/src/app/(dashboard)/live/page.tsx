"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";

interface Tournament {
  id: string;
  name: string;
}

interface EntryPlayer {
  fullName: string;
}
interface Entry {
  player1: EntryPlayer;
  player2: EntryPlayer | null;
}
interface Match {
  id: string;
  round: number;
  status: string;
  category: { name: string };
  entry1: Entry | null;
  entry2: Entry | null;
}

function entryLabel(entry: Entry | null): string {
  if (!entry?.player1) return "TBD";
  return entry.player2?.fullName
    ? `${entry.player1.fullName} / ${entry.player2.fullName}`
    : entry.player1.fullName;
}

export default function LiveIndexPage() {
  const api = useApiClient();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Tournament[]>("/api/tournaments").then((data) => {
      setTournaments(data);
      if (data.length > 0) setTournamentId(data[0].id);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    api<Match[]>(`/api/tournaments/${tournamentId}/matches`).then(setMatches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  if (loading) return <p className="text-slate-400">Loading…</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">Live Scoring</h1>

      <div className="mb-6">
        <label className="mb-1 block text-sm text-slate-300">Tournament</label>
        <select
          value={tournamentId}
          onChange={(e) => setTournamentId(e.target.value)}
          className="w-full max-w-sm rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          {tournaments.length === 0 && <option value="">No tournaments</option>}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Round</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {matches.map((m) => (
              <tr key={m.id} className="bg-slate-950 hover:bg-slate-900/60">
                <td className="px-4 py-3 text-slate-300">R{m.round}</td>
                <td className="px-4 py-3 text-slate-300">{m.category.name}</td>
                <td className="px-4 py-3 text-white">
                  {entryLabel(m.entry1)} vs {entryLabel(m.entry2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs uppercase ${
                      m.status === "LIVE" ? "bg-red-900 text-red-200" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/live/${m.id}`} className="text-sky-400 hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {matches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No matches yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
