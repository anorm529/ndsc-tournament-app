import Link from "next/link";
import { ArrowLeft, Save, Smartphone, TimerReset } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel, Stat } from "@/components/admin/admin-ui";
import { FixtureCard } from "@/components/tournaments/fixture-card";
import { updateFixtureScores } from "@/app/admin/results/actions";
import { getTournamentBundle } from "@/lib/tournaments/data";
import { isFixtureComplete } from "@/lib/tournaments/view-model";

export const dynamic = "force-dynamic";

export default async function ScorekeeperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { fixtures, mvpVotes, teams, tournament } = await getTournamentBundle(slug);
  const openFixtures = fixtures.filter((fixture) => !isFixtureComplete(fixture));
  const completedFixtures = fixtures.filter(isFixtureComplete);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Scorekeeper"
        description="A fast mobile-first score entry screen for tournament day."
        action={
          <Link
            href={`/admin/tournaments/${tournament.slug}/results`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> Full results
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Smartphone} label="Mode" value="Mobile" detail="Score entry" />
        <Stat icon={TimerReset} label="Open" value={`${openFixtures.length}`} detail="Need scores" />
        <Stat icon={Save} label="Saved" value={`${completedFixtures.length}`} detail="Completed" />
      </div>

      <ActionForm action={updateFixtureScores} className="space-y-5 pb-24">
        <input name="tournamentId" type="hidden" value={tournament.id} />
        <Panel
          title="Games needing scores"
          action={<span className="text-sm font-semibold text-slate-500">{openFixtures.length} open</span>}
        >
          {openFixtures.length > 0 ? (
            <div className="grid gap-3">
              {openFixtures.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} mvpMode={tournament.mvpMode} mvpVotes={mvpVotes} teams={teams} mode="admin" />
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-600">
              All games have scores.
            </p>
          )}
        </Panel>

        <Panel
          title="Correct a saved score"
          action={<span className="text-sm font-semibold text-slate-500">{completedFixtures.length} saved</span>}
        >
          {completedFixtures.length > 0 ? (
            <div className="grid gap-3">
              {completedFixtures.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} mvpMode={tournament.mvpMode} mvpVotes={mvpVotes} teams={teams} mode="admin" />
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-600">
              Saved games will appear here.
            </p>
          )}
        </Panel>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-950">{tournament.name}</p>
              <p className="text-xs text-slate-500">{completedFixtures.length}/{fixtures.length} results entered</p>
            </div>
            <SubmitButton className="inline-flex h-12 min-w-32 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400">
              <Save size={16} /> Save
            </SubmitButton>
          </div>
        </div>
      </ActionForm>
    </div>
  );
}
