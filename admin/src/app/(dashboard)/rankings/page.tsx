"use client";

import { useAuth } from "@/lib/auth-context";
import { RankingsBoard } from "@/components/rankings-board";

export default function RankingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">All-Time Rankings</h1>
      <RankingsBoard
        listUrl="/api/rankings"
        computeUrl="/api/rankings/compute"
        canCompute={user?.role === "super_admin"}
      />
    </div>
  );
}
