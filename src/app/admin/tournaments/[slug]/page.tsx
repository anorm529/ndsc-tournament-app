import { CalendarClock, ClipboardCheck, Trophy, Users } from "lucide-react";

import { PageHeader, Panel, Stat } from "@/components/admin/admin-ui";
import { StandingsTable } from "@/components/tournaments/standings-table";
import { getTournamentBundle } from "@/lib/tournaments/data";
import { formatDate, formatTime } from "@/lib/tournaments/format";
import { teamName } from "@/lib/tournaments/view-model";

export const dynamic = "force-dynamic";

export default async function AdminTournamentDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { fixtures, standings, teams, tournament } = await getTournamentBundle(slug);
  const completed = fixtures.filter(
    (fixture) => fixture.homeRuns !== undefined && fixture.awayRuns !== undefined,
  );
  const nextFixture = fixtures.find(
    (fixture) => fixture.homeRuns === undefined || fixture.awayRuns === undefined,
  );

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader title="Dashboard" description={`${tournament.name} - ${formatDate(tournament.date)}`} />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={Trophy} label="Status" value={tournament.status} detail="Public page is live" />
        <Stat icon={Users} label="Teams" value={`${teams.length}`} detail="Rosters partially loaded" />
        <Stat icon={CalendarClock} label="Fixtures" value={`${fixtures.length}`} detail="Round-robin stage" />
        <Stat icon={ClipboardCheck} label="Results" value={`${completed.length}/${fixtures.length}`} detail="Scores entered" />
      </div>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Live Standings">
          <StandingsTable rows={standings} compact />
        </Panel>

        <Panel title="Next Up">
          {nextFixture ? (
            <div className="mt-4 rounded-md bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">
                {formatTime(nextFixture.startsAt)} - {nextFixture.pitch}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {teamName(teams, nextFixture.homeTeamId)} vs {teamName(teams, nextFixture.awayTeamId)}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">All scheduled group games have results.</p>
          )}
        </Panel>
      </section>
    </div>
  );
}
