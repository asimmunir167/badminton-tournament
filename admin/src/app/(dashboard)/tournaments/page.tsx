"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

      <div className="mb-4 rounded-xl border border-sky-900/50 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
        <p className="font-medium">Entry fee & JazzCash / bank settings are inside each tournament</p>
        <p className="mt-1 text-sky-200/80">
          Click a tournament name (or <span className="font-semibold">Open & set fees</span>) → set payment accounts →
          open Categories → set the PKR entry fee.
        </p>
      </div>

      {showForm && <CreateTournamentForm onCancel={() => setShowForm(false)} />}

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
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tournaments.map((t) => (
                <tr key={t.id} className="bg-slate-950 hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-white">
                    <Link href={`/tournaments/${t.id}`} className="text-sky-400 hover:underline">
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
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
                    >
                      Open & set fees
                    </Link>
                  </td>
                </tr>
              ))}
              {tournaments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
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

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function CreateTournamentForm({ onCancel }: { onCancel: () => void }) {
  const api = useApiClient();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    venue: "",
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    format: "KNOCKOUT",
    jazzNumber: "",
    jazzName: "",
    bankName: "",
    accountTitle: "",
    accountNumber: "",
    paymentNotes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const jazzCash =
        emptyToUndefined(form.jazzNumber) && emptyToUndefined(form.jazzName)
          ? { number: form.jazzNumber.trim(), accountName: form.jazzName.trim() }
          : undefined;
      const bank =
        emptyToUndefined(form.bankName) &&
        emptyToUndefined(form.accountTitle) &&
        emptyToUndefined(form.accountNumber)
          ? {
              bankName: form.bankName.trim(),
              accountTitle: form.accountTitle.trim(),
              accountNumber: form.accountNumber.trim(),
            }
          : undefined;
      const paymentAccounts = jazzCash || bank ? { jazzCash, bank } : undefined;

      const created = await api<{ id: string }>("/api/tournaments", {
        method: "POST",
        body: {
          name: form.name,
          venue: form.venue,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          registrationDeadline: new Date(form.registrationDeadline).toISOString(),
          format: form.format,
          ...(paymentAccounts ? { paymentAccounts } : {}),
          ...(form.paymentNotes.trim() ? { paymentInstructions: form.paymentNotes.trim() } : {}),
        },
      });
      router.push(`/tournaments/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create tournament.");
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

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <p className="mb-3 text-sm font-medium text-white">Payment accounts (optional now)</p>
        <p className="mb-3 text-xs text-slate-500">
          You can fill JazzCash/bank here, or set them after create on the tournament page. Category entry fee (PKR
          amount) is set under Categories.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="JazzCash number">
            <input
              value={form.jazzNumber}
              onChange={(e) => setForm({ ...form, jazzNumber: e.target.value })}
              placeholder="03001234567"
              className={inputClass}
            />
          </Field>
          <Field label="JazzCash account name">
            <input
              value={form.jazzName}
              onChange={(e) => setForm({ ...form, jazzName: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Bank name">
            <input
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="HBL"
              className={inputClass}
            />
          </Field>
          <Field label="Account title">
            <input
              value={form.accountTitle}
              onChange={(e) => setForm({ ...form, accountTitle: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Account number">
            <input
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Payment notes">
            <input
              value={form.paymentNotes}
              onChange={(e) => setForm({ ...form, paymentNotes: e.target.value })}
              placeholder="Optional instructions for players"
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create Tournament"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-slate-400 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
