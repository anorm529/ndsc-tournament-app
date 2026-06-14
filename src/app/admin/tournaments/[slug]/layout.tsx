import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Table2,
  Users,
} from "lucide-react";

import { getTournamentBundle } from "@/lib/tournaments/data";

const navItems = [
  { segment: "", label: "Dashboard", icon: LayoutDashboard },
  { segment: "teams", label: "Teams", icon: Users },
  { segment: "schedule", label: "Schedule", icon: CalendarDays },
  { segment: "results", label: "Results", icon: ClipboardList },
  { segment: "standings", label: "Standings", icon: Table2 },
  { segment: "settings", label: "Settings", icon: Settings },
];

export default async function AdminTournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tournament } = await getTournamentBundle(slug);
  const baseHref = `/admin/tournaments/${tournament.slug}`;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-slate-500">Managing tournament</p>
            <h1 className="truncate text-xl font-bold text-slate-950">{tournament.name}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/tournaments"
              className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              All tournaments
            </Link>
            <Link
              href={`/tournaments/${tournament.slug}`}
              className="inline-flex h-9 items-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Public page
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 lg:block lg:space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const href = item.segment ? `${baseHref}/${item.segment}` : baseHref;

            return (
              <Link
                key={item.segment || "dashboard"}
                href={href}
                className="flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
