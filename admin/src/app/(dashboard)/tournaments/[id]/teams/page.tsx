"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Field, inputClass } from "@/components/field";

interface District {
  id: string;
  name: string;
}
interface Team {
  id: string;
  name: string;
  districtId: string;
  status: string;
  paymentStatus: string;
}

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"];

export default function TeamsPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const api = useApiClient();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const canManage =
    user && ["super_admin", "tournament_admin", "district_manager", "team_manager"].includes(user.role);
  const canReview = user?.role === "super_admin" || user?.role === "tournament_admin";

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [t, d] = await Promise.all([
        api<Team[]>(`/api/tournaments/${tournamentId}/teams`),
        api<District[]>("/api/districts"),
      ]);
      setTeams(t);
      setDistricts(d);
    } catch {
      setError("Could not load teams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  function districtName(id: string) {
    return districts.find((d) => d.id === id)?.name ?? id;
  }

  async function updateStatus(teamId: string, status: string) {
    setStatusError(null);
    try {
      await api(`/api/teams/${teamId}/status`, { method: "PATCH", body: { status } });
      refresh();
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : "Could not update status.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Teams</h1>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {showForm ? "Cancel" : "New Team"}
          </button>
        )}
      </div>

      {showForm && (
        <CreateTeamForm
          tournamentId={tournamentId}
          districts={districts}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {statusError && <p className="text-red-400">{statusError}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {teams.map((t) => (
                <tr key={t.id} className="bg-slate-950">
                  <td className="px-4 py-3 font-medium text-white">{t.name}</td>
                  <td className="px-4 py-3 text-slate-300">{districtName(t.districtId)}</td>
                  <td className="px-4 py-3 text-slate-300">{t.paymentStatus}</td>
                  <td className="px-4 py-3">
                    {canReview ? (
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus(t.id, e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs uppercase text-slate-300">
                        {t.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {teams.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No teams yet.
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

function CreateTeamForm({
  tournamentId,
  districts,
  onCreated,
}: {
  tournamentId: string;
  districts: District[];
  onCreated: () => void;
}) {
  const api = useApiClient();
  const [form, setForm] = useState({ name: "", districtId: "", managerPhone: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api(`/api/tournaments/${tournamentId}/teams`, {
        method: "POST",
        body: { ...form, managerPhone: form.managerPhone || undefined },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create team.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Name">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="District">
          <select
            required
            value={form.districtId}
            onChange={(e) => setForm({ ...form, districtId: e.target.value })}
            className={inputClass}
          >
            <option value="">Select…</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Manager Phone (optional)">
          <input
            value={form.managerPhone}
            onChange={(e) => setForm({ ...form, managerPhone: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Team"}
      </button>
    </form>
  );
}
