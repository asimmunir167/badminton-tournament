"use client";

import { useEffect, useMemo, useState } from "react";
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
  if (!entry?.player1) return "TBD";
  return entry.player2?.fullName
    ? `${entry.player1.fullName} / ${entry.player2.fullName}`
    : entry.player1.fullName;
}

function dateKey(value: string | null): string {
  if (!value) return "unscheduled";
  return new Date(value).toISOString().slice(0, 10);
}

function formatDay(value: string): string {
  if (value === "unscheduled") return "Unscheduled";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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
  const [scheduling, setScheduling] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState("45");
  const [breakMins, setBreakMins] = useState("15");
  const [view, setView] = useState<"board" | "list">("board");

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

  async function runAutoSchedule() {
    setActionError(null);
    setScheduling(true);
    try {
      const updated = await api<Match[]>(`/api/tournaments/${tournamentId}/matches/auto-schedule`, {
        method: "POST",
        body: {
          startTime,
          matchDurationMinutes: Number(duration),
          breakMinutes: Number(breakMins),
          dayEndTime: "20:00",
        },
      });
      setMatches(updated);
      setView("board");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not auto-schedule.");
    } finally {
      setScheduling(false);
    }
  }

  const board = useMemo(() => {
    const days = new Map<string, Map<string, Match[]>>();
    for (const match of matches) {
      const day = dateKey(match.scheduledDate);
      const time = match.scheduledTime ?? "—";
      if (!days.has(day)) days.set(day, new Map());
      const times = days.get(day)!;
      if (!times.has(time)) times.set(time, []);
      times.get(time)!.push(match);
    }
    return [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, times]) => ({
        day,
        slots: [...times.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([time, slotMatches]) => ({ time, matches: slotMatches })),
      }));
  }, [matches]);

  const courtColumns = courts.length > 0 ? courts : [{ id: "none", name: "Unassigned" }];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Fixtures</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView("board")}
            className={`rounded-md px-3 py-2 text-xs font-medium ${
              view === "board" ? "bg-sky-600 text-white" : "border border-slate-700 text-slate-300"
            }`}
          >
            Visual board
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-md px-3 py-2 text-xs font-medium ${
              view === "list" ? "bg-sky-600 text-white" : "border border-slate-700 text-slate-300"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {canManage && (
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-3 text-sm font-medium text-white">Auto schedule</p>
          <p className="mb-3 text-xs text-slate-400">
            Fills courts in parallel by round (same time on Court 1, Court 2, …). Later rounds start after earlier
            rounds. Add courts first if you have none.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-slate-400">
              Start time
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
              />
            </label>
            <label className="text-xs text-slate-400">
              Match mins
              <input
                type="number"
                min={15}
                max={180}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-1 block w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
              />
            </label>
            <label className="text-xs text-slate-400">
              Break mins
              <input
                type="number"
                min={0}
                max={60}
                value={breakMins}
                onChange={(e) => setBreakMins(e.target.value)}
                className="mt-1 block w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
              />
            </label>
            <button
              disabled={scheduling}
              onClick={runAutoSchedule}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {scheduling ? "Scheduling…" : "Auto schedule matches"}
            </button>
            <Link href={`/tournaments/${tournamentId}/courts`} className="text-xs text-sky-400 hover:underline">
              Manage courts →
            </Link>
          </div>
        </div>
      )}

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {actionError && <p className="mb-4 text-red-400">{actionError}</p>}

      {!loading && !error && view === "board" && (
        <div className="space-y-8">
          {board.length === 0 && <p className="text-slate-500">No fixtures yet — generate a draw, then auto schedule.</p>}
          {board.map((day) => (
            <div key={day.day}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                {formatDay(day.day)}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 w-24">Time</th>
                      {courtColumns.map((c) => (
                        <th key={c.id} className="px-3 py-2">
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {day.slots.map((slot) => (
                      <tr key={`${day.day}-${slot.time}`} className="bg-slate-950 align-top">
                        <td className="px-3 py-3 font-mono text-xs text-sky-300">{slot.time}</td>
                        {courtColumns.map((court) => {
                          const cellMatches =
                            court.id === "none"
                              ? slot.matches.filter((m) => !m.court)
                              : slot.matches.filter((m) => m.court?.id === court.id);
                          return (
                            <td key={court.id} className="px-3 py-3">
                              {cellMatches.length === 0 && <span className="text-slate-600">—</span>}
                              <div className="space-y-2">
                                {cellMatches.map((m) => (
                                  <div
                                    key={m.id}
                                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
                                  >
                                    <p className="text-[11px] uppercase text-slate-500">
                                      R{m.round} · {m.category.name}
                                    </p>
                                    <p className="text-xs font-medium text-white">
                                      {entryLabel(m.entry1)} vs {entryLabel(m.entry2)}
                                    </p>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                      <span className="text-[10px] uppercase text-slate-400">{m.status}</span>
                                      <Link href={`/live/${m.id}`} className="text-[11px] text-sky-400 hover:underline">
                                        Score
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && view === "list" && (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">When</th>
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
                  <td className="px-4 py-3 text-slate-300">
                    {m.scheduledDate
                      ? `${new Date(m.scheduledDate).toLocaleDateString()} ${m.scheduledTime ?? ""}`
                      : "—"}
                  </td>
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
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
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
