import { CalendarPlus, Trash2 } from "lucide-react";

import { ActionForm, ConfirmSubmitButton } from "@/components/admin/action-form";
import { ButtonShell, PageHeader, Panel } from "@/components/admin/admin-ui";
import { FixtureCard } from "@/components/tournaments/fixture-card";
import { getTournamentBundle } from "@/lib/tournaments/data";
import { formatTime } from "@/lib/tournaments/format";
import { generateRoundRobinSchedule } from "@/lib/tournaments/scheduler";
import { BracketMatch, Fixture, ScheduleBlock, Team } from "@/lib/tournaments/types";
import { groupFixturesBySlot } from "@/lib/tournaments/view-model";
import {
  addScheduleBlock,
  deleteScheduleBlock,
  generatePlacementSchedule,
  generatePlannedPlayoffs,
  generateSchedule,
} from "@/app/admin/schedule/actions";

export const dynamic = "force-dynamic";

export default async function AdminTournamentSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { bracket, fixtures, scheduleBlocks, standings, teams, tournament } = await getTournamentBundle(slug);
  const groupFixtures = fixtures.filter((fixture) => fixture.stage === "group");
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
  const completedGroupFixtures = groupFixtures.filter(
    (fixture) => fixture.homeRuns !== undefined && fixture.awayRuns !== undefined,
  );
  const canGeneratePlacement = teams.length >= 4 && groupFixtures.length > 0 && completedGroupFixtures.length === groupFixtures.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Schedule"
        description="Generate and review round-robin fixtures from teams, pitches, and game duration."
      />
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
      <Panel title="Placement Playoffs">
        <ActionForm action={generatePlacementSchedule} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto] lg:items-end">
          <input name="tournamentId" type="hidden" value={tournament.id} />
          <Field label="Status" value={canGeneratePlacement ? "Ready" : "Needs group results"} />
          <Field label="Pairings" value={getPlacementPreview(standings.length)} />
          <Field label="Existing" value={`${placementFixtures.length} games`} />
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Playoff first pitch</span>
            <input
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
              defaultValue={placementFirstPitchValue}
              name="placementFirstPitch"
              required
              type="datetime-local"
            />
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input className="size-4 rounded border-slate-300" name="includeFifthPlaceGame" type="checkbox" />
              Add 5th v 6th
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input className="size-4 rounded border-slate-300" name="replaceExistingPlacement" type="checkbox" />
              Replace existing
            </label>
            <ButtonShell><CalendarPlus size={16} /> Generate playoffs</ButtonShell>
          </div>
        </ActionForm>
        <p className="mt-4 text-sm text-slate-600">
          NDSC placement games use the round-robin table: 1st v 2nd for the title, 3rd v 4th for third place, and optionally 5th v 6th when a third pitch is available.
        </p>
      </Panel>
      <Panel title="Plan Playoff Slots">
        <ActionForm action={generatePlannedPlayoffs} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <input name="tournamentId" type="hidden" value={tournament.id} />
          <Field label="Creates" value="1v2, 3v4, optional 5v6" />
          <Field label="Teams needed" value="Not yet" />
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
            <ButtonShell><CalendarPlus size={16} /> Plan playoffs</ButtonShell>
          </div>
        </ActionForm>
        <p className="mt-4 text-sm text-slate-600">
          Use this before the tournament starts when you want the public schedule to show the full day, even before playoff teams are known.
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
                <div className="grid gap-3 lg:grid-cols-2">
                  {slotFixtures.map((fixture) => (
                    <FixtureCard key={fixture.id} fixture={fixture} teams={teams} />
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
  scheduleBlocks,
  teams,
}: {
  bracket: BracketMatch[];
  fixtures: Fixture[];
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
          return <FixtureCard key={item.id} fixture={item.fixture} teams={teams} />;
        }

        if (item.type === "bracket") {
          return <PlannedPlayoffCard key={item.id} match={item.match} />;
        }

        return <ScheduleBlockCard key={item.id} block={item.block} />;
      })}
    </div>
  );
}

function PlannedPlayoffCard({ match }: { match: BracketMatch }) {
  return (
    <article className="rounded-md border border-rose-200 bg-rose-50 p-4">
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase text-rose-700">
        <span>{formatTime(match.startsAt)}</span>
        <span>{match.pitch}</span>
      </div>
      <p className="mt-3 text-base font-black text-rose-950">{match.label}</p>
      <p className="mt-1 text-sm font-semibold text-rose-900">
        {match.homeSeed} vs {match.awaySeed}
      </p>
    </article>
  );
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
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function toDatetimeLocalInput(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
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

  return "Need 4 teams";
}
