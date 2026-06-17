import Link from "next/link";
import {
  Archive,
  CalendarDays,
  ClipboardList,
  FileDown,
  History,
  LayoutDashboard,
  MonitorUp,
  Settings,
  ShieldCheck,
  Smartphone,
  Table2,
  UserCheck,
  Users,
} from "lucide-react";

import { getTournamentBundle } from "@/lib/tournaments/data";
import { getCurrentAdminUser, getUserPermissions, type AdminPermissionType } from "@/lib/current-admin";

type NavItem = {
  segment: string;
  label: string;
  icon: React.ElementType;
  permission?: AdminPermissionType;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Tournament",
    items: [
      { segment: "", label: "Dashboard", icon: LayoutDashboard },
      { segment: "teams", label: "Teams", icon: Users, permission: "tournaments" },
      { segment: "schedule", label: "Schedule", icon: CalendarDays, permission: "schedule" },
      { segment: "results", label: "Results", icon: ClipboardList, permission: "scores" },
      { segment: "standings", label: "Standings", icon: Table2 },
    ],
  },
  {
    label: "Operations",
    items: [
      { segment: "check-in", label: "Check-in", icon: ShieldCheck, permission: "check_in" },
      { segment: "scorekeeper", label: "Scorekeeper", icon: Smartphone, permission: "scores" },
      { segment: "umpires", label: "Umpires", icon: UserCheck, permission: "schedule" },
      { segment: "live", label: "Live display", icon: MonitorUp },
    ],
  },
  {
    label: "Admin",
    items: [
      { segment: "templates", label: "Templates", icon: Archive, permission: "schedule" },
      { segment: "exports", label: "Exports", icon: FileDown },
      { segment: "audit", label: "Audit", icon: History },
      { segment: "settings", label: "Settings", icon: Settings, permission: "tournaments" },
    ],
  },
];

export default async function AdminTournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ tournament }, currentUser] = await Promise.all([
    getTournamentBundle(slug),
    getCurrentAdminUser(),
  ]);

  const isOwner = currentUser?.role === "owner";
  const userPermissions = currentUser && !isOwner
    ? await getUserPermissions(currentUser.id)
    : null;

  const canSee = (permission?: AdminPermissionType) => {
    if (!permission) return true;
    if (isOwner) return true;
    return userPermissions?.has(permission) ?? false;
  };

  const baseHref = `/admin/tournaments/${tournament.slug}`;

  return (
    <div className="min-w-0 space-y-5">
      <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4">
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

      <div className="grid min-w-0 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex max-w-full gap-3 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 lg:block lg:space-y-4">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => canSee(item.permission));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="flex shrink-0 gap-2 lg:block lg:space-y-1">
                <p className="hidden px-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400 lg:block">
                  {group.label}
                </p>
                {visibleItems.map((item) => {
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
              </div>
            );
          })}
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
