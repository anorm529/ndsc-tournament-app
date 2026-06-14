import { ClipboardCheck, ListChecks, Save, TimerReset, Trash2 } from "lucide-react";

import { ActionForm, ConfirmSubmitButton, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel, Stat } from "@/components/admin/admin-ui";
import { FixtureCard } from "@/components/tournaments/fixture-card";
import { getTournamentBundle } from "@/lib/tournaments/data";
import { formatTime } from "@/lib/tournaments/format";
import { isFixtureComplete, teamName } from "@/lib/tournaments/view-model";
import {
  deleteMvpVote,
  deleteTournamentMvpVotes,
  fillPlannedPlayoffSlots,
  updateFixtureScores,
} from "@/app/admin/results/actions";

export const dynamic = "force-dynamic";

export default async function AdminTournamentResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { bracket, fixtures, mvpVotes, teams, tournament } = await getTournamentBundle(slug);
  const groupFixtures = fixtures.filter((fixture) => fixture.stage === "group");
  const placementFixtures = fixtures.filter((fixture) => isPlacementStage(fixture.stage));
  const plannedPlacementSlots = bracket.filter((match) => isPlacementStage(match.stage));
  const groupStageComplete =
    groupFixtures.length > 0 && groupFixtures.every((fixture) => isFixtureComplete(fixture));
  const outstanding = fixtures.filter((fixture) => !isFixtureComplete(fixture));
  const completed = fixtures.filter(isFixtureComplete);
  const totalFixtures = fixtures.length;
  const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));

  return (
    <div className="space-y-5">
      <ActionForm action={updateFixtureScores} className="space-y-5 pb-24 lg:pb-0">
        <input name="tournamentId" type="hidden" value={tournament.id} />
        <PageHeader
          title="Results"
          description="Fast score entry for phones and tablets during tournament day."
          action={
            <SubmitButton>
              <Save size={16} /> Save scores
            </SubmitButton>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat icon={TimerReset} label="Open" value={`${outstanding.length}`} detail="Need scores" />
          <Stat icon={ClipboardCheck} label="Entered" value={`${completed.length}`} detail="Saved games" />
          <Stat icon={Save} label="Total" value={`${totalFixtures}`} detail={tournament.name} />
        </div>

        <Panel
          title="Open Games"
          action={<span className="text-sm font-semibold text-slate-500">{outstanding.length} remaining</span>}
        >
          {outstanding.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {outstanding.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} mvpMode={tournament.mvpMode} mvpVotes={mvpVotes} teams={teams} mode="admin" />
              ))}
            </div>
          ) : (
            <EmptyResultsMessage message="All scheduled games have scores." />
          )}
        </Panel>

        <Panel
          title="Entered Results"
          action={<span className="text-sm font-semibold text-slate-500">{completed.length} complete</span>}
        >
          {completed.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {completed.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} mvpMode={tournament.mvpMode} mvpVotes={mvpVotes} teams={teams} mode="admin" />
              ))}
            </div>
          ) : (
            <EmptyResultsMessage message="Completed games will appear here after scores are saved." />
          )}
        </Panel>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-950">{tournament.name}</p>
              <p className="text-xs text-slate-500">
                {completed.length}/{totalFixtures} results entered
              </p>
            </div>
            <SubmitButton className="inline-flex h-12 min-w-32 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400">
              <Save size={16} /> Save
            </SubmitButton>
          </div>
        </div>
      </ActionForm>

      {groupStageComplete ? (
        <Panel
          title="Placement Playoffs"
          action={
            placementFixtures.length > 0 ? (
              <span className="text-sm font-semibold text-slate-500">{placementFixtures.length} ready</span>
            ) : plannedPlacementSlots.length > 0 ? (
              <ActionForm action={fillPlannedPlayoffSlots}>
                <input name="tournamentId" type="hidden" value={tournament.id} />
                <SubmitButton className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400">
                  <ListChecks size={14} /> Fill teams
                </SubmitButton>
              </ActionForm>
            ) : (
              <span className="text-sm font-semibold text-slate-500">No slots planned</span>
            )
          }
        >
          {placementFixtures.length > 0 ? (
            <p className="text-sm font-medium text-slate-600">
              Playoff games are ready in Open Games. Enter their scores and MVPs the same way as group games.
            </p>
          ) : plannedPlacementSlots.length > 0 ? (
            <p className="text-sm font-medium text-slate-600">
              Round-robin scores are complete. Fill the planned playoff slots from the standings, then the playoff
              games will appear in Open Games for scores and MVPs.
            </p>
          ) : (
            <p className="text-sm font-medium text-slate-600">
              Plan playoff slots from the Schedule page first, then return here once the round robin is complete.
            </p>
          )}
        </Panel>
      ) : null}

      <Panel
        title="MVP Votes"
        action={
          mvpVotes.length > 0 ? (
            <ActionForm action={deleteTournamentMvpVotes}>
              <input name="tournamentId" type="hidden" value={tournament.id} />
              <ConfirmSubmitButton
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                confirmMessage={`Delete all MVP votes for ${tournament.name}?`}
              >
                <Trash2 size={14} /> Clear all
              </ConfirmSubmitButton>
            </ActionForm>
          ) : (
            <span className="text-sm font-semibold text-slate-500">0 votes</span>
          )
        }
      >
        {mvpVotes.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {mvpVotes.map((vote) => {
              const fixture = fixturesById.get(vote.fixtureId);
              const matchLabel = fixture
                ? `${formatTime(fixture.startsAt)} - ${teamName(teams, fixture.homeTeamId)} vs ${teamName(teams, fixture.awayTeamId)}`
                : "Fixture removed";

              return (
                <div
                  key={vote.id}
                  className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-950">{vote.playerName}</p>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      {teamName(teams, vote.teamId)} - {vote.category} - {matchLabel}
                    </p>
                  </div>
                  <ActionForm action={deleteMvpVote}>
                    <input name="voteId" type="hidden" value={vote.id} />
                    <ConfirmSubmitButton
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 text-xs font-bold text-rose-800 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      confirmMessage={`Delete MVP vote for ${vote.playerName}?`}
                    >
                      <Trash2 size={14} /> Delete
                    </ConfirmSubmitButton>
                  </ActionForm>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyResultsMessage message="MVP votes will appear here after they are saved against fixtures." />
        )}
      </Panel>
    </div>
  );
}

function EmptyResultsMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-600">
      {message}
    </div>
  );
}

function isPlacementStage(stage: string) {
  return stage === "final" || stage === "third-place" || stage === "fifth-place";
}
