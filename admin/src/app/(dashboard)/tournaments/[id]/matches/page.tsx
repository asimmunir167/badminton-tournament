"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

interface EntryPlayer {
  fullName: string;
}
interface Entry {
  player1: EntryPlayer;
  player2: EntryPlayer | null;
}
interface Court {
  id: string;
  name: string;
}
interface Match {
  id: string;
  round: number;
  matchNumber: number;
  status: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  court: Court | null;
  category: { name: string };
  entry1: Entry | null;
  entry2: Entry | null;
}

function entryLabel(entry: Entry | null): string {
  if (!entry) return "TBD";
  return entry.player2 ? `${entry.player1.fullName} / ${entry.player2.fullName}` : entry.player1.fullName;
}

export default function MatchesPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const api = useApiClient();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = user?.role === "super_admin" || user?.role === "tournament_admin";

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [m, c] = await Promise.all([
        api<Match[]>(`/api/tournaments/${tournamentId}/matches`),
        api<Court[]>(`/api/tournaments/${tournamentId}/courts`),
      ]);
      setMatches(m);
      setCourts(c);
    } catch {
      setError("Could not load fixtures.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function assignCourt(matchId: string, courtId: string) {
    setActionError(null);
    try {
      await api(`/api/matches/${matchId}`, { method: "PATCH", body: { courtId: courtId || null } });
      refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not assign court.");
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">Fixtures</h1>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {actionError && <p className="text-red-400">{actionError}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">Round</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Court</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {matches.map((m) => (
                <tr key={m.id} className="bg-slate-950">
                  <td className="px-4 py-3 text-slate-300">R{m.round}</td>
                  <td className="px-4 py-3 text-slate-300">{m.category.name}</td>
                  <td className="px-4 py-3 text-white">
                    {entryLabel(m.entry1)} vs {entryLabel(m.entry2)}
                  </td>
                  <td className="px-4 py-3">
                    {canManage && m.status !== "COMPLETED" ? (
                      <select
                        value={m.court?.id ?? ""}
                        onChange={(e) => assignCourt(m.id, e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                      >
                        <option value="">Unassigned</option>
                        {courts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-300">{m.court?.name ?? "—"}</span>
                    )}
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
                      Score
                    </Link>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No fixtures yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
