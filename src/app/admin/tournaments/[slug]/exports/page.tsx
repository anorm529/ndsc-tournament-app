import Link from "next/link";
import { Download, FileDown, Printer } from "lucide-react";

import { PageHeader, Panel, Stat } from "@/components/admin/admin-ui";
import { getTournamentBundle } from "@/lib/tournaments/data";

export const dynamic = "force-dynamic";

const exports = [
  { kind: "fixtures", label: "Fixtures and scores", description: "Full fixture list with teams, diamond, scores, and stage." },
  { kind: "standings", label: "Standings", description: "Calculated standings table for the round robin." },
  { kind: "mvp", label: "MVP votes", description: "All MVP votes by fixture, team, category, and player." },
  { kind: "teams", label: "Teams", description: "Team list, captain details, and check-in state." },
  { kind: "audit", label: "Audit log", description: "Operational change history captured by V2 actions." },
];

export default async function ExportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { fixtures, mvpVotes, teams, tournament } = await getTournamentBundle(slug);

  return (
    <div className="space-y-5">
      <PageHeader title="Exports" description="Download tournament records after or during the event." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={FileDown} label="Fixtures" value={`${fixtures.length}`} />
        <Stat icon={FileDown} label="Teams" value={`${teams.length}`} />
        <Stat icon={FileDown} label="MVP votes" value={`${mvpVotes.length}`} />
      </div>
      <Panel title="CSV downloads">
        <div className="grid gap-3 md:grid-cols-2">
          {exports.map((item) => (
            <Link
              key={item.kind}
              className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-rose-200 hover:bg-white"
              href={`/admin/tournaments/${tournament.slug}/exports/${item.kind}`}
            >
              <span>
                <span className="block text-sm font-bold text-slate-950">{item.label}</span>
                <span className="mt-1 block text-xs font-medium text-slate-600">{item.description}</span>
              </span>
              <Download size={18} className="shrink-0 text-slate-500" />
            </Link>
          ))}
        </div>
      </Panel>
      <Panel title="Print pack">
        <Link
          className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-200 hover:bg-white"
          href={`/admin/tournaments/${tournament.slug}/print`}
          target="_blank"
        >
          <span>
            <span className="block text-sm font-bold text-slate-950">Tournament pack</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">Printable teams, schedule, score sheet, and standings.</span>
          </span>
          <Printer size={18} className="shrink-0 text-slate-500" />
        </Link>
      </Panel>
    </div>
  );
}
