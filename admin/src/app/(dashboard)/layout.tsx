"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <main className="flex min-h-screen items-center justify-center text-slate-400">Loading…</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex-1">
        <Topbar user={user} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
