"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import { RankingsBoard } from "@/components/rankings-board";

interface Tournament {
  id: string;
  name: string;
  venue: string;
  startDate: string;
  endDate: string;
  status: string;
  format: string;
}

const SECTIONS = [
  { href: "categories", label: "Categories" },
  { href: "teams", label: "Teams" },
  { href: "registrations", label: "Registrations" },
  { href: "matches", label: "Fixtures" },
  { href: "courts", label: "Courts" },
  { href: "referees", label: "Referees" },
];

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApiClient();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Tournament>(`/api/tournaments/${id}`)
      .then(setTournament)
      .catch(() => setError("Could not load tournament."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (error || !tournament) return <p className="text-red-400">{error ?? "Not found."}</p>;

  const canCompute = user?.role === "super_admin" || user?.role === "tournament_admin";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">{tournament.name}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {tournament.venue} · {new Date(tournament.startDate).toLocaleDateString()} –{" "}
        {new Date(tournament.endDate).toLocaleDateString()} · {tournament.format.replaceAll("_", " ")} ·{" "}
        <span className="uppercase">{tournament.status}</span>
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={`/tournaments/${id}/${s.href}`}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-sky-600"
          >
            <p className="text-base font-medium text-white">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-white">Rankings</h2>
        <RankingsBoard
          listUrl={`/api/tournaments/${id}/rankings`}
          computeUrl={`/api/tournaments/${id}/rankings/compute`}
          canCompute={canCompute}
        />
      </div>
    </div>
  );
}
