import { Download } from "lucide-react";

import { ButtonShell, PageHeader, Panel } from "@/components/admin/admin-ui";
import { MvpLeaderboard } from "@/components/tournaments/mvp-leaderboard";
import { StandingsTable } from "@/components/tournaments/standings-table";
import { getTournamentBundle } from "@/lib/tournaments/data";

export const dynamic = "force-dynamic";

export default async function AdminTournamentStandingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { mvpLeaders, standings, tournament } = await getTournamentBundle(slug);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Standings"
        description="Calculated from entered group-stage scores using tournament points rules."
        action={<ButtonShell><Download size={16} /> Export CSV</ButtonShell>}
      />
      <Panel title={`${tournament.name} Table`}>
        <StandingsTable rows={standings} />
      </Panel>
      <Panel title="MVP Leaderboard">
        <MvpLeaderboard leaders={mvpLeaders} />
      </Panel>
      <Panel title="Tiebreak Rules">
        <ol className="space-y-2 text-sm text-slate-700">
          <li>1. Points</li>
          <li>2. Run difference</li>
          <li>3. Runs for</li>
          <li>4. Team name until head-to-head rules are added</li>
        </ol>
      </Panel>
    </div>
  );
}
