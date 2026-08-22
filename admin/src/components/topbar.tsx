"use client";

import { useAuth, type AuthUser } from "@/lib/auth-context";

export function Topbar({ user }: { user: AuthUser }) {
  const { logout } = useAuth();
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
      <div className="text-sm text-slate-400">
        Signed in as <span className="text-slate-200">{user.fullName}</span> ·{" "}
        <span className="uppercase text-sky-400">{user.role.replace("_", " ")}</span>
      </div>
      <button
        onClick={() => logout()}
        className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
      >
        Log out
      </button>
    </header>
  );
}
