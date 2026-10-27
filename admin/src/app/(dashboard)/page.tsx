"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";

interface OpsStats {
  totalTournaments: number;
  totalDistricts: number;
  totalPlayers: number;
  liveMatches: number;
  pendingRegistrations: number;
  pendingPayments: number;
  feesCollectedPkr: number;
}

export default function DashboardPage() {
  const api = useApiClient();
  const [stats, setStats] = useState<OpsStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<OpsStats>("/api/ops/stats")
      .then(setStats)
      .catch(() => setError("Could not load dashboard stats."));
  }, [api]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!stats) return <p className="text-slate-400">Loading dashboard…</p>;

  const tiles: { label: string; value: string | number }[] = [
    { label: "Tournaments", value: stats.totalTournaments },
    { label: "Districts", value: stats.totalDistricts },
    { label: "Players", value: stats.totalPlayers },
    { label: "Live Matches", value: stats.liveMatches },
    { label: "Pending Registrations", value: stats.pendingRegistrations },
    { label: "Pending Payments", value: stats.pendingPayments },
    { label: "Fees Collected (PKR)", value: stats.feesCollectedPkr.toLocaleString() },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-white">Ops Dashboard</h1>
      <p className="mb-6 text-sm text-slate-400">
        Fees, live play, and approval backlog across all tournaments.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{tile.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{tile.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-400">
        Open a tournament → <span className="text-slate-200">Ops &amp; Export</span> for per-event fees, delayed
        matches, court utilization, CSV export, and spectator link.
      </p>
      <Link href="/tournaments" className="mt-3 inline-block text-sm text-sky-400 hover:underline">
        Go to tournaments →
      </Link>
    </div>
  );
}
