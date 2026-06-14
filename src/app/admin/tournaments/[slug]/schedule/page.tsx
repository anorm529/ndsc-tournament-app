import { CalendarPlus, RotateCcw, Save, Send, Trash2, Undo2 } from "lucide-react";

import { ActionForm, ConfirmSubmitButton, SubmitButton } from "@/components/admin/action-form";
import { ButtonShell, PageHeader, Panel } from "@/components/admin/admin-ui";
import { getTournamentBundle } from "@/lib/tournaments/data";
import { formatTime } from "@/lib/tournaments/format";
import { generateRoundRobinSchedule } from "@/lib/tournaments/scheduler";
import { BracketMatch, Fixture, ScheduleBlock, Team } from "@/lib/tournaments/types";
import { groupFixturesBySlot, isFixtureComplete, teamName } from "@/lib/tournaments/view-model";
import {
  addScheduleBlock,
  deleteSchedule,
  deleteScheduleBlock,
  generatePlannedPlayoffs,
  generateSchedule,
  publishSchedule,
  unpublishSchedule,
  updateFixtureSchedule,
  updatePlannedPlayoffSlot,
} from "@/app/admin/schedule/actions";

export const dynamic = "force-dynamic";

export default async function AdminTournamentSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { bracket, fixtures, scheduleBlocks, standings, teams, tournament } = await getTournamentBundle(slug);
  const placementFixtures = fixtures.filter((fixture) =>
    fixture.stage === "final" || fixture.stage === "third-place" || fixture.stage === "fifth-place"
  );
  const generatedPreview = generateRoundRobinSchedule({
    tournament,
    teams,
    firstPitch: fixtures[0]?.startsAt ?? tournament.checkInTime,
  });
  const groupedFixtures = groupFixturesBySlot(fixtures);
  const firstPitchValue = toDatetimeLocalInput(fixtures[0]?.startsAt ?? tournament.checkInTime);
  const placementFirstPitchValue = toDatetimeLocalInput(getNextFixtureSlot(fixtures, tournament.gameMinutes + tournament.slotGapMinutes, tournament.checkInTime));
  const plannedPlayoffFirstPitchValue = placementFirstPitchValue;
  const lunchStartsAtValue = toDatetimeLocalInput(getLunchSlot(fixtures, tournament.checkInTime));
  const fairnessWarnings = getScheduleFairnessWarnings(fixtures, teams);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Schedule"
        description="Generate and review round-robin fixtures from teams, pitches, and game duration."
      />
      <Panel title="Schedule Status">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Public" value={tournament.schedulePublished ? "Published" : "Draft"} />
            <Field label="Matches" value={`${fixtures.length}`} />
            <Field label="Extras" value={`${scheduleBlocks.length + bracket.length}`} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {tournament.schedulePublished ? (
              <ActionForm action={unpublishSchedule}>
                <input name="tournamentId" type="hidden" value={tournament.id} />
                <SubmitButton className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                  <Undo2 size={16} /> Move to draft
                </SubmitButton>
              </ActionForm>
            ) : (
              <ActionForm action={publishSchedule}>
                <input name="tournamentId" type="hidden" value={tournament.id} />
                <SubmitButton className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-700 px-4 text-sm font-semibold text-white transition hover:bg-rose-800">
                  <Send size={16} /> Publish schedule
                </SubmitButton>
              </ActionForm>
            )}
            <ActionForm action={deleteSchedule}>
              <input name="tournamentId" type="hidden" value={tournament.id} />
              <ConfirmSubmitButton
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                confirmMessage="Delete all matches, planned playoff slots, breaks, scores, and MVP votes for this tournament?"
                pendingChildren="Deleting..."
              >
                <RotateCcw size={16} /> Delete schedule
              </ConfirmSubmitButton>
            </ActionForm>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Generate and edit the schedule as a draft. Publish it when the day plan is ready for the public tournament page.
        </p>
      </Panel>
      <Panel title="Fairness Warnings">
        {fairnessWarnings.length > 0 ? (
          <ul className="space-y-2">
            {fairnessWarnings.map((warning) => (
              <li key={warning} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                {warning}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            No obvious back-to-back or pitch-balance warnings.
          </p>
        )}
      </Panel>
      <Panel title="Generation Settings">
        <ActionForm action={generateSchedule} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto] lg:items-end">
          <input name="tournamentId" type="hidden" value={tournament.id} />
          <Field label="Teams" value={`${teams.length}`} />
          <Field label="Pitches" value={tournament.pitches.join(", ") || "No pitches"} />
          <Field label="Slot length" value={`${tournament.gameMinutes}+${tournament.slotGapMinutes} min`} />
          <Field label="Preview games" value={`${generatedPreview.length}`} />
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">First pitch</span>
            <input
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
              defaultValue={firstPitchValue}
              name="firstPitch"
              required
              type="datetime-local"
            />
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input className="size-4 rounded border-slate-300" name="replaceExisting" type="checkbox" />
              Replace existing
            </label>
            <ButtonShell><CalendarPlus size={16} /> Generate</ButtonShell>
          </div>
        </ActionForm>
      </Panel>
      <Panel title="Placement Playoff Slots">
        <ActionForm action={generatePlannedPlayoffs} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <input name="tournamentId" type="hidden" value={tournament.id} />
          <Field label="Creates" value={getPlacementPreview(standings.length)} />
          <Field label="Existing slots" value={`${bracket.length}`} />
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Playoff slot time</span>
            <input
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
              defaultValue={plannedPlayoffFirstPitchValue}
              name="plannedPlayoffFirstPitch"
              required
              type="datetime-local"
            />
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input className="size-4 rounded border-slate-300" name="includePlannedFifthPlaceGame" type="checkbox" />
              Add 5th v 6th
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input className="size-4 rounded border-slate-300" name="replaceExistingPlannedPlayoffs" type="checkbox" />
              Replace existing
            </label>
            <ButtonShell><CalendarPlus size={16} /> Plan slots</ButtonShell>
          </div>
        </ActionForm>
        <p className="mt-4 text-sm text-slate-600">
          Use this before the tournament starts to reserve placement games in the day plan. With 3 teams this creates
          1st v 2nd only; 4+ teams also get 3rd v 4th, and 6+ teams can optionally add 5th v 6th.
        </p>
      </Panel>
      <Panel title="Breaks and Lunch">
        <ActionForm action={addScheduleBlock} className="grid gap-4 md:grid-cols-[1fr_1fr_0.7fr_auto] md:items-end">
          <input name="tournamentId" type="hidden" value={tournament.id} />
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Label</span>
            <input
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
              defaultValue="Lunch"
              name="blockLabel"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Starts</span>
            <input
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
              defaultValue={lunchStartsAtValue}
              name="blockStartsAt"
              required
              type="datetime-local"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Minutes</span>
            <input
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
              defaultValue="30"
              min={1}
              name="blockDurationMinutes"
              required
              type="number"
            />
          </label>
          <ButtonShell><CalendarPlus size={16} /> Add break</ButtonShell>
        </ActionForm>
      </Panel>
      <Panel title="Full Day Plan">
        <DayPlan
          bracket={placementFixtures.length > 0 ? [] : bracket}
          fixtures={fixtures}
          pitches={tournament.pitches}
          scheduleBlocks={scheduleBlocks}
          teams={teams}
        />
      </Panel>
      <Panel title="Current Schedule">
        {fixtures.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedFixtures).map(([startsAt, slotFixtures]) => (
              <div key={startsAt}>
                <p className="mb-2 text-sm font-bold text-slate-600">{formatTime(startsAt)}</p>
                <div className="grid gap-3">
                  {slotFixtures.map((fixture) => (
                    <EditableFixtureCard key={fixture.id} fixture={fixture} pitches={tournament.pitches} teams={teams} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No fixtures yet. Set the first pitch time and generate a round robin.</p>
        )}
      </Panel>
    </div>
  );
}

function DayPlan({
  bracket,
  fixtures,
  pitches,
  scheduleBlocks,
  teams,
}: {
  bracket: BracketMatch[];
  fixtures: Fixture[];
  pitches: string[];
  scheduleBlocks: ScheduleBlock[];
  teams: Team[];
}) {
  const items = [
    ...fixtures.map((fixture) => ({
      id: `fixture-${fixture.id}`,
      startsAt: fixture.startsAt,
      type: "fixture" as const,
      fixture,
    })),
    ...bracket.map((match) => ({
      id: `bracket-${match.id}`,
      startsAt: match.startsAt,
      type: "bracket" as const,
      match,
    })),
    ...scheduleBlocks.map((block) => ({
      id: `block-${block.id}`,
      startsAt: block.startsAt,
      type: "block" as const,
      block,
    })),
  ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  if (items.length === 0) {
    return <p className="text-sm text-slate-600">No schedule items yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        if (item.type === "fixture") {
          return <EditableFixtureCard key={item.id} fixture={item.fixture} pitches={pitches} teams={teams} />;
        }

        if (item.type === "bracket") {
          return <PlannedPlayoffCard key={item.id} match={item.match} pitches={pitches} />;
        }

        return <ScheduleBlockCard key={item.id} block={item.block} />;
      })}
    </div>
  );
}

function EditableFixtureCard({
  fixture,
  pitches,
  teams,
}: {
  fixture: Fixture;
  pitches: string[];
  teams: Team[];
}) {
  const complete = isFixtureComplete(fixture);

  return (
    <article className="overflow-hidden rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <span>{formatTime(fixture.startsAt)}</span>
            <span>{getFixtureStageLabel(fixture.stage)} - {fixture.pitch}</span>
            {complete ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Scored</span> : null}
          </div>
          <p className="break-words text-base font-black leading-snug text-slate-950">
            {teamName(teams, fixture.homeTeamId)} vs {teamName(teams, fixture.awayTeamId)}
          </p>
        </div>
        <ActionForm action={updateFixtureSchedule} className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(220px,1.2fr)_minmax(140px,0.8fr)_auto] xl:items-end">
          <input name="fixtureId" type="hidden" value={fixture.id} />
          <label className="block min-w-0">
            <span className="text-[11px] font-bold uppercase text-slate-500">Home</span>
            <select
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold"
              defaultValue={fixture.homeTeamId}
              name="homeTeamId"
              required
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-[11px] font-bold uppercase text-slate-500">Away</span>
            <select
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold"
              defaultValue={fixture.awayTeamId}
              name="awayTeamId"
              required
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-[11px] font-bold uppercase text-slate-500">Time</span>
            <input
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold"
              defaultValue={toDatetimeLocalInput(fixture.startsAt)}
              name="fixtureStartsAt"
              required
              type="datetime-local"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-[11px] font-bold uppercase text-slate-500">Pitch</span>
            <select
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold"
              defaultValue={fixture.pitch}
              name="pitchName"
              required
            >
              {pitches.map((pitch) => (
                <option key={pitch} value={pitch}>{pitch}</option>
              ))}
            </select>
          </label>
          <SubmitButton className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 md:col-span-2 xl:col-span-1">
            <Save size={15} /> Save
          </SubmitButton>
        </ActionForm>
      </div>
    </article>
  );
}

function PlannedPlayoffCard({ match, pitches }: { match: BracketMatch; pitches: string[] }) {
  return (
    <article className="overflow-hidden rounded-md border border-rose-200 bg-rose-50 p-4">
      <div className="grid gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-xs font-bold uppercase text-rose-700">
            <span>{formatTime(match.startsAt)}</span>
            <span>{match.pitch}</span>
          </div>
          <p className="mt-3 break-words text-base font-black text-rose-950">{match.label}</p>
          <p className="mt-1 text-sm font-semibold text-rose-900">
            {match.homeSeed} vs {match.awaySeed}
          </p>
        </div>
        <ActionForm action={updatePlannedPlayoffSlot} className="grid min-w-0 gap-2 md:grid-cols-[minmax(220px,1fr)_minmax(150px,0.8fr)_auto] md:items-end">
          <input name="matchId" type="hidden" value={match.id} />
          <label className="block min-w-0">
            <span className="text-[11px] font-bold uppercase text-rose-700">Time</span>
            <input
              className="mt-1 h-10 w-full rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold"
              defaultValue={toDatetimeLocalInput(match.startsAt)}
              name="matchStartsAt"
              required
              type="datetime-local"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-[11px] font-bold uppercase text-rose-700">Pitch</span>
            <select
              className="mt-1 h-10 w-full rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold"
              defaultValue={match.pitch}
              name="pitchName"
              required
            >
              {pitches.map((pitch) => (
                <option key={pitch} value={pitch}>{pitch}</option>
              ))}
            </select>
          </label>
          <SubmitButton className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-700 px-3 text-sm font-semibold text-white transition hover:bg-rose-800">
            <Save size={15} /> Save
          </SubmitButton>
        </ActionForm>
      </div>
    </article>
  );
}

function getFixtureStageLabel(stage: Fixture["stage"]) {
  const labels: Record<Fixture["stage"], string> = {
    "fifth-place": "5th place",
    final: "Final",
    group: "Group",
    "semi-final": "Semi-final",
    "third-place": "3rd place",
  };

  return labels[stage];
}

function ScheduleBlockCard({ block }: { block: ScheduleBlock }) {
  return (
    <article className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase text-amber-700">
          {formatTime(block.startsAt)}-{formatTime(block.endsAt)}
        </p>
        <p className="mt-1 text-base font-black text-amber-950">{block.label}</p>
      </div>
      <ActionForm action={deleteScheduleBlock}>
        <input name="blockId" type="hidden" value={block.id} />
        <ConfirmSubmitButton
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          confirmMessage={`Remove ${block.label} from the schedule?`}
        >
          <Trash2 size={14} /> Remove
        </ConfirmSubmitButton>
      </ActionForm>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-slate-50 p-3">
      <p className="truncate text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function toDatetimeLocalInput(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

function getNextFixtureSlot(fixtures: Array<{ startsAt: string }>, gameMinutes: number, fallback: string) {
  if (fixtures.length === 0) {
    return fallback;
  }

  const latestStartsAt = fixtures.reduce((latest, fixture) => {
    const startsAt = new Date(fixture.startsAt).getTime();
    return startsAt > latest ? startsAt : latest;
  }, 0);
  const next = new Date(latestStartsAt);
  next.setMinutes(next.getMinutes() + gameMinutes);

  return next.toISOString();
}

function getLunchSlot(fixtures: Array<{ startsAt: string }>, fallback: string) {
  if (fixtures.length === 0) {
    return fallback;
  }

  const midpoint = fixtures[Math.floor(fixtures.length / 2)];
  return midpoint?.startsAt ?? fallback;
}

function getPlacementPreview(teamCount: number) {
  if (teamCount >= 6) {
    return "1v2, 3v4, optional 5v6";
  }

  if (teamCount >= 4) {
    return "1v2 and 3v4";
  }

  if (teamCount >= 3) {
    return "1v2 only";
  }

  return "Need 3 teams";
}

function getScheduleFairnessWarnings(fixtures: Fixture[], teams: Team[]) {
  const warnings: string[] = [];
  const groupFixtures = fixtures
    .filter((fixture) => fixture.stage === "group")
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const teamFixtures = new Map<string, Fixture[]>();

  for (const team of teams) {
    teamFixtures.set(team.id, []);
  }

  for (const fixture of groupFixtures) {
    teamFixtures.get(fixture.homeTeamId)?.push(fixture);
    teamFixtures.get(fixture.awayTeamId)?.push(fixture);
  }

  for (const team of teams) {
    const items = teamFixtures.get(team.id) ?? [];

    for (let index = 1; index < items.length; index += 1) {
      const previous = items[index - 1];
      const current = items[index];

      if (previous.startsAt === current.startsAt) {
        warnings.push(`${team.name} is listed twice at ${formatTime(current.startsAt)}.`);
      }

      const gapMinutes = (new Date(current.startsAt).getTime() - new Date(previous.startsAt).getTime()) / 60000;

      if (gapMinutes > 0 && gapMinutes <= 60) {
        warnings.push(`${team.name} has back-to-back games around ${formatTime(previous.startsAt)} and ${formatTime(current.startsAt)}.`);
      }
    }
  }

  const pitchCounts = groupFixtures.reduce<Record<string, number>>((counts, fixture) => {
    counts[fixture.pitch] = (counts[fixture.pitch] ?? 0) + 1;
    return counts;
  }, {});
  const counts = Object.values(pitchCounts);

  if (counts.length > 1 && Math.max(...counts) - Math.min(...counts) > 1) {
    warnings.push("Pitch usage is uneven by more than one group game.");
  }

  return [...new Set(warnings)].slice(0, 8);
}
