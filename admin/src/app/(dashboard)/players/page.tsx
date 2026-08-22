"use client";

import { FormEvent, useEffect, useState } from "react";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Field, inputClass } from "@/components/field";

interface District {
  id: string;
  name: string;
}
interface Player {
  id: string;
  fullName: string;
  gender: string;
  registrationId: string;
  status: string;
  phone: string | null;
}

const STATUSES = ["ACTIVE", "INJURED", "WITHDRAWN", "SUSPENDED"];

export default function PlayersPage() {
  const api = useApiClient();
  const { user } = useAuth();
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtId, setDistrictId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const canManage =
    user && ["super_admin", "district_manager", "team_manager", "player"].includes(user.role);
  const canReview = user?.role === "super_admin" || user?.role === "district_manager";

  useEffect(() => {
    api<District[]>("/api/districts").then((data) => {
      setDistricts(data);
      if (data.length > 0) setDistrictId(data[0].id);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshPlayers() {
    if (!districtId) return;
    setError(null);
    try {
      const data = await api<Player[]>(`/api/districts/${districtId}/players`);
      setPlayers(data);
    } catch {
      setError("Could not load players.");
    }
  }

  useEffect(() => {
    refreshPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId]);

  async function updateStatus(playerId: string, status: string) {
    try {
      await api(`/api/players/${playerId}/status`, { method: "PATCH", body: { status } });
      refreshPlayers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update status.");
    }
  }

  if (loading) return <p className="text-slate-400">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Players</h1>
        {canManage && districtId && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {showForm ? "Cancel" : "New Player"}
          </button>
        )}
      </div>

      <div className="mb-6">
        <label className="mb-1 block text-sm text-slate-300">District</label>
        <select
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
          className="w-full max-w-sm rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        >
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
          {districts.length === 0 && <option value="">No districts</option>}
        </select>
      </div>

      {showForm && districtId && (
        <CreatePlayerForm
          districtId={districtId}
          onCreated={() => {
            setShowForm(false);
            refreshPlayers();
          }}
        />
      )}

      {error && <p className="text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Registration ID</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {players.map((p) => (
              <tr key={p.id} className="bg-slate-950">
                <td className="px-4 py-3 font-medium text-white">{p.fullName}</td>
                <td className="px-4 py-3 text-slate-300">{p.gender}</td>
                <td className="px-4 py-3 text-slate-300">{p.registrationId}</td>
                <td className="px-4 py-3 text-slate-300">{p.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  {canReview ? (
                    <select
                      value={p.status}
                      onChange={(e) => updateStatus(p.id, e.target.value)}
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
                      {p.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No players in this district yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreatePlayerForm({ districtId, onCreated }: { districtId: string; onCreated: () => void }) {
  const api = useApiClient();
  const [form, setForm] = useState({ fullName: "", fatherName: "", gender: "MALE", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api(`/api/districts/${districtId}/players`, {
        method: "POST",
        body: {
          fullName: form.fullName,
          gender: form.gender,
          fatherName: form.fatherName || undefined,
          phone: form.phone || undefined,
        },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create player.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Full Name">
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Father's Name (optional)">
          <input
            value={form.fatherName}
            onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Gender">
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputClass}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </Field>
        <Field label="Phone (optional)">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
        </Field>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Player"}
      </button>
    </form>
  );
}
