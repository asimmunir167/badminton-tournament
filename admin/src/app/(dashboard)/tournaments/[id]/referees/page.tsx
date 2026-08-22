"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Field, inputClass } from "@/components/field";

interface UserSummary {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
}
interface Referee {
  id: string;
  certificationLevel: string | null;
  user: { id: string; fullName: string; email: string | null; phone: string | null };
}

export default function RefereesPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const api = useApiClient();
  const { user } = useAuth();
  const [referees, setReferees] = useState<Referee[]>([]);
  const [candidates, setCandidates] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const canManage = user?.role === "super_admin" || user?.role === "tournament_admin";

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const refs = await api<Referee[]>(`/api/tournaments/${tournamentId}/referees`);
      setReferees(refs);
      if (canManage) {
        const users = await api<UserSummary[]>("/api/users", { query: { role: "referee" } });
        setCandidates(users);
      }
    } catch {
      setError("Could not load referees.");
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
        <h1 className="text-2xl font-semibold text-white">Referees</h1>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {showForm ? "Cancel" : "Assign Referee"}
          </button>
        )}
      </div>

      {showForm && (
        <AssignRefereeForm
          tournamentId={tournamentId}
          candidates={candidates}
          onAssigned={() => {
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
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Certification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {referees.map((r) => (
                <tr key={r.id} className="bg-slate-950">
                  <td className="px-4 py-3 font-medium text-white">{r.user.fullName}</td>
                  <td className="px-4 py-3 text-slate-300">{r.user.email ?? r.user.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{r.certificationLevel ?? "—"}</td>
                </tr>
              ))}
              {referees.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    No referees assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {canManage && candidates.length === 0 && !loading && (
        <p className="mt-4 text-sm text-slate-500">
          No users with the &quot;referee&quot; role were found — they need to register an account first.
        </p>
      )}
    </div>
  );
}

function AssignRefereeForm({
  tournamentId,
  candidates,
  onAssigned,
}: {
  tournamentId: string;
  candidates: UserSummary[];
  onAssigned: () => void;
}) {
  const api = useApiClient();
  const [userId, setUserId] = useState("");
  const [certificationLevel, setCertificationLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api(`/api/tournaments/${tournamentId}/referees`, {
        method: "POST",
        body: { userId, certificationLevel: certificationLevel || undefined },
      });
      onAssigned();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not assign referee.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      {error && <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Referee">
          <select required value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass}>
            <option value="">Select…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} {c.email ? `(${c.email})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Certification Level (optional)">
          <input
            value={certificationLevel}
            onChange={(e) => setCertificationLevel(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <button
        type="submit"
        disabled={submitting || candidates.length === 0}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {submitting ? "Assigning…" : "Assign Referee"}
      </button>
    </form>
  );
}
