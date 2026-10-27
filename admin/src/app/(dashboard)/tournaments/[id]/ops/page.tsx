"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApiClient } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

interface OpsData {
  name: string;
  status: string;
  registrations: { total: number; pending: number; approved: number; rejected: number };
  fees: { expectedPkr: number; collectedPkr: number; pendingPkr: number; unpaidCount: number };
  matches: {
    total: number;
    live: number;
    completed: number;
    upcoming: number;
    delayed: number;
    delayedMatches: {
      id: string;
      category: string;
      round: number;
      matchNumber: number;
      scheduledTime: string | null;
      court: string | null;
    }[];
  };
  courts: {
    courtId: string;
    name: string;
    status: string;
    totalAssigned: number;
    live: number;
    completed: number;
  }[];
}

interface Certificate {
  id: string;
  type: string;
  certificateNumber: string;
  pdfUrl: string | null;
  player: { fullName: string } | null;
  category: { name: string } | null;
}

export default function TournamentOpsPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const api = useApiClient();
  const [ops, setOps] = useState<OpsData | null>(null);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setError(null);
    try {
      const [o, c, cats] = await Promise.all([
        api<OpsData>(`/api/ops/tournaments/${tournamentId}`),
        api<Certificate[]>(`/api/tournaments/${tournamentId}/certificates`),
        api<{ id: string; name: string }[]>(`/api/tournaments/${tournamentId}/categories`),
      ]);
      setOps(o);
      setCerts(c);
      setCategories(cats);
    } catch {
      setError("Could not load ops data.");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function sendReminders() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api<{ notificationsSent: number }>(
        `/api/tournaments/${tournamentId}/matches/reminders/starting-soon`,
        { method: "POST", body: { withinMinutes: 45 } },
      );
      setMessage(`Sent ${result.notificationsSent} starting-soon notifications.`);
      refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Reminder send failed.");
    } finally {
      setBusy(false);
    }
  }

  async function issueCerts(categoryId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const issued = await api<unknown[]>(`/api/categories/${categoryId}/certificates/issue`, {
        method: "POST",
        body: {},
      });
      setMessage(`Issued ${issued.length} certificates.`);
      refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Certificate issue failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    let token: string | null = null;
    try {
      const raw = localStorage.getItem("tournament-admin-auth");
      token = raw ? (JSON.parse(raw) as { accessToken?: string }).accessToken ?? null : null;
    } catch {
      token = null;
    }
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/ops/tournaments/${tournamentId}/export/registrations.csv`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (r) => {
        if (!r.ok) throw new Error("export failed");
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `registrations-${tournamentId}.csv`;
        a.click();
      })
      .catch(() => setMessage("CSV download failed."));
  }

  if (error) return <p className="text-red-400">{error}</p>;
  if (!ops) return <p className="text-slate-400">Loading ops…</p>;

  const spectatorPath = `/spectate/${tournamentId}`;

  return (
    <div>
      <Link href={`/tournaments/${tournamentId}`} className="text-sm text-sky-400 hover:underline">
        ← Back to tournament
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">Ops · {ops.name}</h1>
      <p className="mt-1 text-sm text-slate-400">Status: {ops.status}</p>

      {message && <p className="mt-3 text-sm text-sky-300">{message}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Fees expected" value={`PKR ${ops.fees.expectedPkr.toLocaleString()}`} />
        <Tile label="Fees collected" value={`PKR ${ops.fees.collectedPkr.toLocaleString()}`} />
        <Tile label="Fees pending" value={`PKR ${ops.fees.pendingPkr.toLocaleString()}`} />
        <Tile label="Delayed matches" value={ops.matches.delayed} />
      </div>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-medium text-white">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={spectatorPath}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
          >
            Open spectator board
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={downloadCsv}
            className="rounded-md bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Export entries/fees CSV
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={sendReminders}
            className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Send “starting soon” reminders
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Share spectator URL with audience: {typeof window !== "undefined" ? window.location.origin : ""}
          {spectatorPath}
        </p>
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-medium text-white">Courts</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {ops.courts.map((c) => (
            <li key={c.courtId} className="flex justify-between border-b border-slate-800 py-2">
              <span>
                {c.name} · {c.status}
              </span>
              <span>
                live {c.live} · done {c.completed} · assigned {c.totalAssigned}
              </span>
            </li>
          ))}
          {ops.courts.length === 0 && <li className="text-slate-500">No courts yet.</li>}
        </ul>
      </section>

      {ops.matches.delayedMatches.length > 0 && (
        <section className="mt-8 rounded-xl border border-amber-900/50 bg-amber-950/20 p-5">
          <h2 className="text-lg font-medium text-amber-200">Delayed (15+ min past schedule)</h2>
          <ul className="mt-3 space-y-2 text-sm text-amber-100/80">
            {ops.matches.delayedMatches.map((m) => (
              <li key={m.id}>
                {m.category} R{m.round} #{m.matchNumber} · {m.scheduledTime} · {m.court ?? "no court"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-medium text-white">Certificates</h2>
        <p className="mt-1 text-sm text-slate-400">Issue PDFs from category rankings (or participation if rankings pending).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              disabled={busy}
              onClick={() => issueCerts(cat.id)}
              className="rounded-md bg-violet-700 px-3 py-2 text-sm text-white hover:bg-violet-600 disabled:opacity-50"
            >
              Issue · {cat.name}
            </button>
          ))}
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {certs.map((c) => (
            <li key={c.id} className="flex justify-between gap-3 border-b border-slate-800 py-2 text-slate-300">
              <span>
                {c.player?.fullName ?? "—"} · {c.type} · {c.category?.name}
              </span>
              {c.pdfUrl ? (
                <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                  PDF
                </a>
              ) : (
                <span className="text-slate-500">No PDF</span>
              )}
            </li>
          ))}
          {certs.length === 0 && <li className="text-slate-500">No certificates issued yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
