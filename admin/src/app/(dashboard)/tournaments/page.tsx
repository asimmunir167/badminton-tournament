"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Field, inputClass } from "@/components/field";

interface Tournament {
  id: string;
  name: string;
  venue: string;
  startDate: string;
  endDate: string;
  status: string;
  format: string;
}

export default function TournamentsPage() {
  const api = useApiClient();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Tournament[]>("/api/tournaments");
      setTournaments(data);
    } catch {
      setError("Could not load tournaments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Tournaments</h1>
        {user?.role === "super_admin" && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {showForm ? "Cancel" : "New Tournament"}
          </button>
        )}
      </div>

      {showForm && (
        <CreateTournamentForm
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tournaments.map((t) => (
                <tr key={t.id} className="bg-slate-950 hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-white">
                    <Link href={`/tournaments/${t.id}`} className="hover:text-sky-400 hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{t.venue}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{t.format.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs uppercase text-slate-300">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {tournaments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No tournaments yet.
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

function CreateTournamentForm({ onCreated }: { onCreated: () => void }) {
  const api = useApiClient();
  const [form, setForm] = useState({
    name: "",
    venue: "",
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    format: "KNOCKOUT",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api("/api/tournaments", {
        method: "POST",
        body: {
          ...form,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create tournament.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Venue">
          <input
            required
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Start Date">
          <input
            required
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="End Date">
          <input
            required
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Registration Deadline">
          <input
            required
            type="date"
            value={form.registrationDeadline}
            onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Format">
          <select
            value={form.format}
            onChange={(e) => setForm({ ...form, format: e.target.value })}
            className={inputClass}
          >
            <option value="KNOCKOUT">Knockout</option>
            <option value="ROUND_ROBIN">Round Robin</option>
            <option value="GROUP_KNOCKOUT">Group + Knockout</option>
          </select>
        </Field>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Tournament"}
      </button>
    </form>
  );
}
