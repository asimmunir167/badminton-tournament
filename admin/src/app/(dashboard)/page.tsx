"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";

interface Tournament {
  id: string;
  status: string;
}
interface District {
  id: string;
}
interface Team {
  id: string;
}
interface Match {
  id: string;
  status: string;
}

interface Stats {
  totalTournaments: number;
  activeTournaments: number;
  totalDistricts: number;
  totalTeams: number;
  totalMatches: number;
  liveMatches: number;
  completedMatches: number;
  upcomingMatches: number;
}

export default function DashboardPage() {
  const api = useApiClient();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [tournaments, districts] = await Promise.all([
          api<Tournament[]>("/api/tournaments"),
          api<District[]>("/api/districts"),
        ]);

        // No global "all teams / all matches" endpoint exists yet, so this
        // aggregates per-tournament — fine at the tournament counts this
        // app is built for, but would want a dedicated stats endpoint at
        // real scale (hundreds of tournaments).
        const perTournament = await Promise.all(
          tournaments.map(async (t) => {
            const [teams, matches] = await Promise.all([
              api<Team[]>(`/api/tournaments/${t.id}/teams`),
              api<Match[]>(`/api/tournaments/${t.id}/matches`),
            ]);
            return { teams, matches };
          }),
        );

        if (cancelled) return;

        const totalTeams = perTournament.reduce((sum, p) => sum + p.teams.length, 0);
        const allMatches = perTournament.flatMap((p) => p.matches);

        setStats({
          totalTournaments: tournaments.length,
          activeTournaments: tournaments.filter((t) => t.status === "ONGOING" || t.status === "PUBLISHED").length,
          totalDistricts: districts.length,
          totalTeams,
          totalMatches: allMatches.length,
          liveMatches: allMatches.filter((m) => m.status === "LIVE").length,
          completedMatches: allMatches.filter((m) => m.status === "COMPLETED").length,
          upcomingMatches: allMatches.filter((m) => m.status === "SCHEDULED" || m.status === "STARTING_SOON").length,
        });
      } catch {
        if (!cancelled) setError("Could not load dashboard stats.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!stats) return <p className="text-slate-400">Loading dashboard…</p>;

  const tiles: { label: string; value: number }[] = [
    { label: "Total Tournaments", value: stats.totalTournaments },
    { label: "Active Tournaments", value: stats.activeTournaments },
    { label: "Districts", value: stats.totalDistricts },
    { label: "Teams", value: stats.totalTeams },
    { label: "Matches", value: stats.totalMatches },
    { label: "Live Matches", value: stats.liveMatches },
    { label: "Completed Matches", value: stats.completedMatches },
    { label: "Upcoming Matches", value: stats.upcomingMatches },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{tile.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{tile.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
