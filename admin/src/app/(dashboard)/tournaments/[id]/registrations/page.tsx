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
  entryFee: string | null;
}
interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  method: string;
  transactionRef: string | null;
  proofUrl: string | null;
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
  const [tidQuery, setTidQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function markPayment(id: string, status: "PAID" | "FAILED" | "REFUNDED") {
    setActionError(null);
    setBusyId(id);
    try {
      await api(`/api/registrations/${id}/payment`, { method: "PATCH", body: { status } });
      refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update payment.");
    } finally {
      setBusyId(null);
    }
  }

  // For a player who paid at the venue in cash without going through the app
  // — creates the payment record and immediately marks it paid.
  async function recordCashPayment(reg: Registration) {
    if (!reg.category?.entryFee) return;
    setActionError(null);
    setBusyId(reg.id);
    try {
      await api(`/api/registrations/${reg.id}/payment`, {
        method: "POST",
        body: { amount: Number(reg.category.entryFee), method: "MANUAL" },
      });
      await api(`/api/registrations/${reg.id}/payment`, { method: "PATCH", body: { status: "PAID" } });
      refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not record payment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Registrations</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={tidQuery}
            onChange={(e) => setTidQuery(e.target.value)}
            placeholder="Search TID / player / ref…"
            className="w-56 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          />
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
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Status</th>
                {canReview && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {registrations
                .filter((r) => {
                  const q = tidQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    r.player?.fullName.toLowerCase().includes(q) ||
                    r.payment?.transactionRef?.toLowerCase().includes(q) ||
                    r.payment?.method?.toLowerCase().includes(q) ||
                    r.category?.name.toLowerCase().includes(q)
                  );
                })
                .map((r) => {
                const feeRequired = r.category?.entryFee != null && Number(r.category.entryFee) > 0;
                const busy = busyId === r.id;
                return (
                  <tr key={r.id} className="bg-slate-950 align-top">
                    <td className="px-4 py-3 font-medium text-white">{r.player?.fullName ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{r.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{new Date(r.submittedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {!feeRequired && <span className="text-slate-500">Free</span>}
                      {feeRequired && (
                        <div className="space-y-1">
                          <p>
                            {r.payment ? r.payment.amount : Number(r.category!.entryFee)} PKR ·{" "}
                            <span
                              className={
                                r.payment?.status === "PAID"
                                  ? "text-emerald-400"
                                  : r.payment?.status === "FAILED"
                                    ? "text-red-400"
                                    : "text-amber-400"
                              }
                            >
                              {r.payment?.status ?? "NOT SUBMITTED"}
                            </span>
                          </p>
                          {r.payment?.transactionRef && (
                            <p className="text-xs text-slate-500">
                              {r.payment.method.replaceAll("_", " ")} · Ref: {r.payment.transactionRef}
                            </p>
                          )}
                          {r.payment?.proofUrl && (
                            <a
                              href={r.payment.proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-sky-400 hover:underline"
                            >
                              View receipt
                            </a>
                          )}
                          {canReview && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {r.payment && r.payment.status !== "PAID" && (
                                <button
                                  disabled={busy}
                                  onClick={() => markPayment(r.id, "PAID")}
                                  className="rounded-md bg-emerald-800 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {r.payment && r.payment.status === "PENDING" && (
                                <button
                                  disabled={busy}
                                  onClick={() => markPayment(r.id, "FAILED")}
                                  className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                                >
                                  Mark Failed
                                </button>
                              )}
                              {r.payment && r.payment.status === "PAID" && (
                                <button
                                  disabled={busy}
                                  onClick={() => markPayment(r.id, "REFUNDED")}
                                  className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                                >
                                  Mark Refunded
                                </button>
                              )}
                              {!r.payment && (
                                <button
                                  disabled={busy}
                                  onClick={() => recordCashPayment(r)}
                                  className="rounded-md bg-emerald-800 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Record Cash Payment
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
                );
              })}
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
