"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  roles?: string[]; // omit = visible to every authenticated role
}

// Teams, Categories, Registrations, Fixtures, Courts, and Referees are all
// scoped to one tournament — they live under /tournaments/[id]/... and are
// reached via that tournament's detail page, not a flat top-level link.
const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/districts", label: "Districts", roles: ["super_admin"] },
  { href: "/players", label: "Players" },
  { href: "/live", label: "Live Scoring" },
  { href: "/rankings", label: "Rankings" },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-950 px-4 py-6">
      <div className="mb-6 px-2 text-lg font-semibold text-white">🏸 Tournament Admin</div>
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm ${
                active ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
