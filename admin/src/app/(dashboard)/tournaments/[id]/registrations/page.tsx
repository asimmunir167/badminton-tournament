"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

interface Player {
  fullName: string;
}
interface Category {
  name: string;
}
interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: string;
}
interface Registration {
  id: string;
  status: string;
  submittedAt: string;
  player: Player | null;
  category: Category | null;
  payment: Payment | null;
}

export default function RegistrationsPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const api = useApiClient();
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canReview = user?.role === "super_admin" || user?.role === "tournament_admin";

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Registration[]>(`/api/tournaments/${tournamentId}/registrations`, {
        query: { status: statusFilter || undefined },
      });
      setRegistrations(data);
    } catch {
      setError("Could not load registrations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, statusFilter]);

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    setActionError(null);
    try {
      await api(`/api/registrations/${id}/status`, { method: "PATCH", body: { status } });
      refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update registration.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Registrations</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {actionError && <p className="text-red-400">{actionError}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                {canReview && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {registrations.map((r) => (
                <tr key={r.id} className="bg-slate-950">
                  <td className="px-4 py-3 font-medium text-white">{r.player?.fullName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{r.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{new Date(r.submittedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {r.payment ? `${r.payment.amount} ${r.payment.currency} · ${r.payment.status}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs uppercase text-slate-300">
                      {r.status}
                    </span>
                  </td>
                  {canReview && (
                    <td className="px-4 py-3 text-right">
                      {r.status === "PENDING" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => review(r.id, "APPROVED")}
                            className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => review(r.id, "REJECTED")}
                            className="rounded-md bg-red-900 px-2 py-1 text-xs font-medium text-white hover:bg-red-800"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {registrations.length === 0 && (
                <tr>
                  <td colSpan={canReview ? 6 : 5} className="px-4 py-6 text-center text-slate-500">
                    No registrations yet.
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
