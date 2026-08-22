"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

interface RankingRow {
  entityId: string;
  rank: number;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  entity: { name?: string; fullName?: string } | null;
}

export function RankingsBoard({
  listUrl,
  computeUrl,
  canCompute,
}: {
  listUrl: string;
  computeUrl: string;
  canCompute: boolean;
}) {
  const api = useApiClient();
  const [entityType, setEntityType] = useState<"PLAYER" | "TEAM" | "DISTRICT">("DISTRICT");
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api<RankingRow[]>(listUrl, { query: { entityType } })
      .then(setRows)
      .catch(() => setError("Could not load rankings."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, listUrl]);

  async function compute() {
    setComputing(true);
    setError(null);
    try {
      await api(computeUrl, { method: "POST" });
      const data = await api<RankingRow[]>(listUrl, { query: { entityType } });
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not compute rankings.");
    } finally {
      setComputing(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          {(["DISTRICT", "TEAM", "PLAYER"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setEntityType(t)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                entityType === t ? "bg-sky-600 text-white" : "bg-slate-900 text-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {canCompute && (
          <button
            onClick={compute}
            disabled={computing}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {computing ? "Computing…" : "Recompute"}
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Gold</th>
              <th className="px-4 py-3">Silver</th>
              <th className="px-4 py-3">Bronze</th>
              <th className="px-4 py-3">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r) => (
              <tr key={r.entityId} className="bg-slate-950">
                <td className="px-4 py-3 text-slate-300">{r.rank}</td>
                <td className="px-4 py-3 text-white">{r.entity?.name ?? r.entity?.fullName ?? r.entityId}</td>
                <td className="px-4 py-3 text-slate-300">{r.gold}</td>
                <td className="px-4 py-3 text-slate-300">{r.silver}</td>
                <td className="px-4 py-3 text-slate-300">{r.bronze}</td>
                <td className="px-4 py-3 text-slate-300">{r.points}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No rankings computed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
