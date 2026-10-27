"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Field, inputClass } from "@/components/field";

interface EntryPlayer {
  fullName: string;
}
interface Entry {
  player1: EntryPlayer;
  player2: EntryPlayer | null;
}
interface MatchRef {
  id: string;
  entry1: Entry | null;
  entry2: Entry | null;
}
interface Court {
  id: string;
  name: string;
  status: string;
  currentMatch: MatchRef | null;
  nextMatch: MatchRef | null;
}

function entryLabel(entry: Entry | null): string {
  if (!entry?.player1) return "TBD";
  return entry.player2?.fullName
    ? `${entry.player1.fullName} / ${entry.player2.fullName}`
    : entry.player1.fullName;
}

function matchLabel(m: MatchRef | null): string {
  if (!m) return "—";
  return `${entryLabel(m.entry1)} vs ${entryLabel(m.entry2)}`;
}

export default function CourtsPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const api = useApiClient();
  const { user } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const canManage = user?.role === "super_admin" || user?.role === "tournament_admin";

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Court[]>(`/api/tournaments/${tournamentId}/courts`);
      setCourts(data);
    } catch {
      setError("Could not load courts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Courts</h1>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {showForm ? "Cancel" : "New Court"}
          </button>
        )}
      </div>

      {showForm && (
        <CreateCourtForm
          tournamentId={tournamentId}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courts.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-white">{c.name}</p>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-xs uppercase text-slate-300">
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">Current</p>
              <p className="mb-2 text-sm text-slate-300">{matchLabel(c.currentMatch)}</p>
              <p className="text-xs text-slate-500">Next</p>
              <p className="text-sm text-slate-300">{matchLabel(c.nextMatch)}</p>
            </div>
          ))}
          {courts.length === 0 && <p className="text-slate-500">No courts yet.</p>}
        </div>
      )}
    </div>
  );
}

function CreateCourtForm({ tournamentId, onCreated }: { tournamentId: string; onCreated: () => void }) {
  const api = useApiClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api(`/api/tournaments/${tournamentId}/courts`, { method: "POST", body: { name } });
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create court.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 flex items-end gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      <Field label="Court Name">
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Court"}
      </button>
    </form>
  );
}
