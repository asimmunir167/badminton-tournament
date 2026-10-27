"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Field, inputClass } from "@/components/field";

interface Category {
  id: string;
  name: string;
  type: "SINGLES" | "DOUBLES";
  gender: string;
  entryFee: string | null;
}
interface Player {
  id: string;
  fullName: string;
}
interface District {
  id: string;
}
interface Entry {
  id: string;
  seed: number | null;
  player1: Player;
  player2: Player | null;
}
interface DrawMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: string;
  entry1: Entry | null;
  entry2: Entry | null;
}
interface Draw {
  id: string;
  format: string;
  isLocked: boolean;
  matches: DrawMatch[];
}

function entryLabel(entry: Entry | null): string {
  if (!entry?.player1) return "TBD";
  return entry.player2?.fullName
    ? `${entry.player1.fullName} / ${entry.player2.fullName}`
    : entry.player1.fullName;
}

export default function CategoryDetailPage() {
  const { id: tournamentId, categoryId } = useParams<{ id: string; categoryId: string }>();
  const api = useApiClient();
  const { user } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = user?.role === "super_admin" || user?.role === "tournament_admin";

  async function refreshEntries() {
    const ents = await api<Entry[]>(`/api/categories/${categoryId}/entries`);
    setEntries(ents);
  }

  async function refreshDraw() {
    try {
      const d = await api<Draw>(`/api/categories/${categoryId}/draw`);
      setDraw(d);
    } catch {
      setDraw(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([api<Category>(`/api/categories/${categoryId}`), refreshEntries(), refreshDraw()])
      .then(([cat]) => setCategory(cat))
      .catch(() => setError("Could not load category."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  useEffect(() => {
    if (!canManage) return;
    (async () => {
      const districts = await api<District[]>("/api/districts");
      const perDistrict = await Promise.all(
        districts.map((d) => api<Player[]>(`/api/districts/${d.id}/players`)),
      );
      setPlayers(perDistrict.flat());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (error || !category) return <p className="text-red-400">{error ?? "Not found."}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">{category.name}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {category.type} · {category.gender}
      </p>

      <EntryFeeEditor
        categoryId={categoryId}
        entryFee={category.entryFee}
        canManage={canManage}
        onSaved={(fee) => setCategory((c) => (c ? { ...c, entryFee: fee } : c))}
      />

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-white">Entries</h2>

        {canManage && (
          <AddEntryForm categoryId={categoryId} category={category} players={players} onAdded={refreshEntries} />
        )}

        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">Seed</th>
                <th className="px-4 py-3">Entry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {entries.map((e) => (
                <tr key={e.id} className="bg-slate-950">
                  <td className="px-4 py-3 text-slate-300">{e.seed ?? "—"}</td>
                  <td className="px-4 py-3 text-white">{entryLabel(e)}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                    No entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DrawSection
        tournamentId={tournamentId}
        categoryId={categoryId}
        draw={draw}
        canManage={canManage}
        onChanged={refreshDraw}
      />
    </div>
  );
}

function EntryFeeEditor({
  categoryId,
  entryFee,
  canManage,
  onSaved,
}: {
  categoryId: string;
  entryFee: string | null;
  canManage: boolean;
  onSaved: (entryFee: string | null) => void;
}) {
  const api = useApiClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entryFee ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const updated = await api<{ entryFee: string | null }>(`/api/categories/${categoryId}`, {
        method: "PATCH",
        body: { entryFee: value ? Number(value) : 0 },
      });
      onSaved(updated.entryFee);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update entry fee.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">2. Entry fee for this category</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {entryFee && Number(entryFee) > 0
                ? `PKR ${Number(entryFee).toLocaleString()}`
                : "Free entry (players will not see payment)"}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600"
            >
              {entryFee && Number(entryFee) > 0 ? "Change fee" : "Set entry fee"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0 = free"
        className={inputClass}
      />
      <button
        disabled={saving}
        onClick={save}
        className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        Save
      </button>
      <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:underline">
        Cancel
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function AddEntryForm({
  categoryId,
  category,
  players,
  onAdded,
}: {
  categoryId: string;
  category: Category;
  players: Player[];
  onAdded: () => void;
}) {
  const api = useApiClient();
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [seed, setSeed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api(`/api/categories/${categoryId}/entries`, {
        method: "POST",
        body: {
          player1Id,
          ...(category.type === "DOUBLES" ? { player2Id } : {}),
          ...(seed ? { seed: Number(seed) } : {}),
        },
      });
      setPlayer1Id("");
      setPlayer2Id("");
      setSeed("");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add entry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Player 1">
          <select required value={player1Id} onChange={(e) => setPlayer1Id(e.target.value)} className={inputClass}>
            <option value="">Select…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </Field>
        {category.type === "DOUBLES" && (
          <Field label="Player 2">
            <select required value={player2Id} onChange={(e) => setPlayer2Id(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {players
                .filter((p) => p.id !== player1Id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <Field label="Seed (optional)">
          <input type="number" min={1} value={seed} onChange={(e) => setSeed(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add Entry"}
      </button>
    </form>
  );
}

function DrawSection({
  tournamentId,
  categoryId,
  draw,
  canManage,
  onChanged,
}: {
  tournamentId: string;
  categoryId: string;
  draw: Draw | null;
  canManage: boolean;
  onChanged: () => void;
}) {
  const api = useApiClient();
  const [format, setFormat] = useState<"KNOCKOUT" | "ROUND_ROBIN" | "GROUP_KNOCKOUT" | "TEHSIL_KNOCKOUT">("KNOCKOUT");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scheduleNote, setScheduleNote] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setScheduleNote(null);
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function generateAndSchedule() {
    setError(null);
    setScheduleNote(null);
    setBusy(true);
    try {
      await api(`/api/categories/${categoryId}/draw/generate`, { method: "POST", body: { format } });
      onChanged();
      try {
        await api(`/api/tournaments/${tournamentId}/matches/auto-schedule`, {
          method: "POST",
          body: { categoryId, startTime: "09:00", matchDurationMinutes: 45, breakMinutes: 15 },
        });
        setScheduleNote("Draw generated and matches auto-scheduled. Open Fixtures to see the visual board.");
      } catch (err) {
        setScheduleNote(
          err instanceof ApiError
            ? `Draw generated. Schedule skipped: ${err.message}`
            : "Draw generated. Add courts, then auto-schedule from Fixtures.",
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const rounds = draw
    ? Object.values(
        draw.matches.reduce<Record<number, DrawMatch[]>>((acc, m) => {
          (acc[m.round] ??= []).push(m);
          return acc;
        }, {}),
      ).sort((a, b) => a[0].round - b[0].round)
    : [];

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Draw</h2>
        {canManage && (
          <div className="flex items-center gap-2">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "KNOCKOUT" | "ROUND_ROBIN" | "GROUP_KNOCKOUT" | "TEHSIL_KNOCKOUT")}
              className={inputClass}
            >
              <option value="KNOCKOUT">Knockout</option>
              <option value="ROUND_ROBIN">Round Robin</option>
              <option value="GROUP_KNOCKOUT">Group + Knockout</option>
              <option value="TEHSIL_KNOCKOUT">Tehsil + District Knockout</option>
            </select>
            <button
              disabled={busy || draw?.isLocked}
              onClick={generateAndSchedule}
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {draw ? "Regenerate + schedule" : "Generate draw + schedule"}
            </button>
            {(draw?.format === "GROUP_KNOCKOUT" || draw?.format === "TEHSIL_KNOCKOUT") && (
              <button
                disabled={busy || draw.isLocked}
                onClick={() =>
                  run(() => api(`/api/categories/${categoryId}/draw/advance`, { method: "POST", body: {} }))
                }
                className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
              >
                {draw.format === "TEHSIL_KNOCKOUT" ? "Advance to district KO" : "Advance to knockout"}
              </button>
            )}
            <button
              disabled={busy || draw?.isLocked}
              onClick={() =>
                run(() => api(`/api/categories/${categoryId}/draw/generate`, { method: "POST", body: { format } }))
              }
              className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Draw only
            </button>
            {draw && (
              <button
                disabled={busy}
                onClick={() =>
                  run(() =>
                    api(`/api/categories/${categoryId}/draw/${draw.isLocked ? "unlock" : "lock"}`, {
                      method: "POST",
                    }),
                  )
                }
                className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                {draw.isLocked ? "Unlock" : "Lock"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-red-400">{error}</p>}
      {scheduleNote && (
        <p className="mb-4 rounded-md border border-sky-900/50 bg-sky-950/40 px-3 py-2 text-sm text-sky-100">
          {scheduleNote}{" "}
          <Link href={`/tournaments/${tournamentId}/matches`} className="underline hover:text-white">
            Open Fixtures →
          </Link>
        </p>
      )}

      {!draw && <p className="text-slate-500">No draw generated yet.</p>}

      {draw && (
        <div className="space-y-6">
          {rounds.map((roundMatches) => (
            <div key={roundMatches[0].round}>
              <p className="mb-2 text-sm font-medium text-slate-400">Round {roundMatches[0].round}</p>
              <div className="overflow-hidden rounded-xl border border-slate-800">
                {roundMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 last:border-b-0"
                  >
                    <span className="text-sm text-white">
                      {entryLabel(m.entry1)} vs {entryLabel(m.entry2)}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs uppercase text-slate-300">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
