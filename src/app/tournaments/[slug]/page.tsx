import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  ListChecks,
  MapPin,
  Megaphone,
  Medal,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { MvpLeaderboard } from "@/components/tournaments/mvp-leaderboard";
import { StandingsTable } from "@/components/tournaments/standings-table";
import { getTournamentBundle, getTournaments } from "@/lib/tournaments/data";
import { formatDate, formatTime } from "@/lib/tournaments/format";
import { BracketMatch, Fixture, ScheduleBlock, Standing, Team } from "@/lib/tournaments/types";
import { isFixtureComplete, teamName } from "@/lib/tournaments/view-model";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const tournaments = await getTournaments();
  return tournaments.map((event) => ({ slug: event.slug }));
}

export default async function TournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { bracket, fixtures, mvpLeaders, scheduleBlocks, standings, teams, tournament: event } = await getTournamentBundle(slug);
  const publicFixtures = event.schedulePublished ? fixtures : [];
  const publicBracket = event.schedulePublished ? bracket : [];
  const publicScheduleBlocks = event.schedulePublished ? scheduleBlocks : [];
  const publicStandings = event.schedulePublished ? standings : [];
  const completedFixtures = publicFixtures.filter(isFixtureComplete);
  const results = [...completedFixtures]
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    .slice(0, 4);
  const nextFixture = publicFixtures.find((fixture) => !isFixtureComplete(fixture));
  const placementFixtures = publicFixtures.filter((fixture) =>
    fixture.stage === "final" || fixture.stage === "third-place" || fixture.stage === "fifth-place"
  );
  const groupFixtures = publicFixtures.filter((fixture) => fixture.stage === "group");
  const roundRobinComplete =
    groupFixtures.length > 0 && groupFixtures.every((fixture) => isFixtureComplete(fixture));
  const finalPlacements = getFinalPlacements(publicStandings, placementFixtures, teams);
  const hasFinalPlacements = finalPlacements.length > 0;
  const leader = publicStandings[0];
  const winner = finalPlacements[0];
  const scheduleItemCount = publicFixtures.length + publicScheduleBlocks.length + (placementFixtures.length > 0 ? 0 : publicBracket.length);

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-slate-950">
      <section className="bg-rose-700 text-white">
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-6 lg:py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-rose-100 hover:text-white">
            <ArrowLeft size={16} /> All tournaments
          </Link>
          <div className="mt-7">
            <div>
              <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-rose-50">
                {event.status} tournament
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{event.name}</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-rose-50 sm:text-lg">
                Schedule, live standings, results, playoffs, and MVP leaders for the club tournament day.
              </p>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <Info icon={CalendarDays} label={formatDate(event.date)} />
              <Info icon={MapPin} label={event.venue} />
              <Info
                icon={Trophy}
                label={`${event.pitches.length} pitches - ${event.gameMinutes} min games${event.slotGapMinutes > 0 ? ` + ${event.slotGapMinutes} min gap` : ""}`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_380px]">
        <div className="space-y-5">
          <Announcements announcements={event.announcements} />

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Full Day Schedule</h2>
                <p className="text-sm text-slate-600">
                  {event.schedulePublished
                    ? "Games, breaks, and planned playoff slots."
                    : "The tournament schedule is being finalised."}
                </p>
              </div>
              <span className="text-sm font-bold text-slate-500">{scheduleItemCount} items</span>
            </div>
            {event.schedulePublished ? (
              <FullDaySchedule
                bracket={placementFixtures.length > 0 ? [] : publicBracket}
                fixtures={publicFixtures}
                scheduleBlocks={publicScheduleBlocks}
                teams={teams}
              />
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-600">
                Schedule will appear here once confirmed.
              </p>
            )}
          </section>

          {roundRobinComplete ? (
            <PlayoffPanel bracket={bracket} placementFixtures={placementFixtures} teams={teams} />
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">At a Glance</h2>
            <div className="mt-4 grid gap-3">
              <SnapshotCard icon={Users} label="Teams" value={`${teams.length}`} />
              <SnapshotCard icon={ListChecks} label="Results" value={`${completedFixtures.length}/${publicFixtures.length}`} />
              <SnapshotCard
                icon={Clock}
                label="Next up"
                value={nextFixture ? formatTime(nextFixture.startsAt) : "Complete"}
                detail={nextFixture ? `${teamName(teams, nextFixture.homeTeamId)} vs ${teamName(teams, nextFixture.awayTeamId)}` : "All fixtures played"}
              />
              <SnapshotCard
                icon={Medal}
                label={winner ? "Winner" : "Leader"}
                value={winner?.teamName ?? leader?.teamName ?? "TBC"}
                detail={winner ? "Tournament complete" : leader ? `${leader.points} pts` : "Standings pending"}
              />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">{hasFinalPlacements ? "Final Placements" : "Live Standings"}</h2>
            <div className="mt-4">
              {hasFinalPlacements ? (
                <FinalPlacementsList placements={finalPlacements} />
              ) : (
                <StandingsTable rows={publicStandings} compact />
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Latest Results</h2>
            <div className="mt-4 space-y-2">
              {results.length > 0 ? (
                results.map((fixture) => (
                  <ResultRow key={fixture.id} fixture={fixture} teams={teams} />
                ))
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm font-medium text-slate-600">
                  Results will appear here once scores are entered.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">MVP Leaders</h2>
            <div className="mt-4">
              <MvpLeaderboard leaders={mvpLeaders} limit={5} />
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function FullDaySchedule({
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
    return (
      <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm font-medium text-slate-600">
        Fixtures will appear once the schedule is generated.
      </p>
    );
  }

  const groupedItems = items.reduce<Array<{ startsAt: string; items: typeof items }>>((groups, item) => {
    const group = groups.find((existing) => existing.startsAt === item.startsAt);

    if (group) {
      group.items.push(item);
    } else {
      groups.push({ startsAt: item.startsAt, items: [item] });
    }

    return groups;
  }, []);

  return (
    <div className="mt-4 grid gap-3 xl:grid-cols-2">
      {groupedItems.map((group) => (
        <section key={group.startsAt} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-black text-slate-950">{formatTime(group.startsAt)}</p>
            <p className="text-xs font-bold uppercase text-slate-500">
              {group.items.length} item{group.items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="space-y-2">
            {group.items.map((item) => {
              if (item.type === "fixture") {
                return <MiniFixtureCard key={item.id} fixture={item.fixture} teams={teams} />;
              }

              if (item.type === "bracket") {
                return <PublicPlannedPlayoff key={item.id} match={item.match} />;
              }

              return <PublicScheduleBlock key={item.id} block={item.block} />;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function PublicPlannedPlayoff({ match }: { match: BracketMatch }) {
  return (
    <article className="rounded-md border border-rose-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase text-rose-700">
        <span>{match.pitch}</span>
        <span>Playoff</span>
      </div>
      <p className="mt-2 text-sm font-black text-rose-950">{match.label}</p>
      <p className="mt-1 text-sm font-semibold text-rose-900">
        {match.homeSeed} vs {match.awaySeed}
      </p>
    </article>
  );
}

function PublicScheduleBlock({ block }: { block: ScheduleBlock }) {
  return (
    <article className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-bold uppercase text-amber-700">
        {formatTime(block.startsAt)}-{formatTime(block.endsAt)}
      </p>
      <p className="mt-1 text-sm font-black text-amber-950">{block.label}</p>
    </article>
  );
}

function MiniFixtureCard({ fixture, teams }: { fixture: Fixture; teams: Team[] }) {
  const complete = isFixtureComplete(fixture);

  return (
    <article className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase text-slate-500">
        <span>{getFixtureStageLabel(fixture.stage)}</span>
        <span>{fixture.pitch}</span>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <span className="truncate text-right text-sm font-bold text-slate-950">
          {teamName(teams, fixture.homeTeamId)}
        </span>
        <span className="min-w-14 rounded bg-slate-950 px-2.5 py-1.5 text-center text-sm font-black text-white">
          {complete ? `${fixture.homeRuns}-${fixture.awayRuns}` : "vs"}
        </span>
        <span className="truncate text-sm font-bold text-slate-950">
          {teamName(teams, fixture.awayTeamId)}
        </span>
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

function Info({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-rose-50">
      <Icon size={17} className="shrink-0" />
      <span>{label}</span>
    </div>
  );
}

function Announcements({ announcements }: { announcements: string[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-rose-700" />
        <h2 className="text-lg font-bold">Announcements</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <p key={announcement} className="rounded-md bg-rose-50 px-4 py-3 text-sm font-medium text-rose-950">
              {announcement}
            </p>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600">
            No announcements yet.
          </p>
        )}
      </div>
    </section>
  );
}

function SnapshotCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail?: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={16} />
        <span className="text-[11px] font-bold uppercase">{label}</span>
      </div>
      <p className="mt-2 truncate text-base font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-1 truncate text-xs font-medium text-slate-500">{detail}</p> : null}
    </div>
  );
}

function ResultRow({ fixture, teams }: { fixture: Fixture; teams: Team[] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase text-slate-500">
        <span>{formatTime(fixture.startsAt)}</span>
        <span>{fixture.pitch}</span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-bold text-slate-950">
        <span className="truncate text-right">{teamName(teams, fixture.homeTeamId)}</span>
        <span className="rounded bg-slate-950 px-2.5 py-1.5 text-white">
          {fixture.homeRuns}-{fixture.awayRuns}
        </span>
        <span className="truncate">{teamName(teams, fixture.awayTeamId)}</span>
      </div>
    </div>
  );
}

function PlayoffPanel({
  bracket,
  placementFixtures,
  teams,
}: {
  bracket: Array<{
    id: string;
    label: string;
    startsAt: string;
    pitch: string;
    homeSeed: string;
    awaySeed: string;
  }>;
  placementFixtures: Fixture[];
  teams: Team[];
}) {
  if (placementFixtures.length === 0 && bracket.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm font-medium text-slate-600">
        Playoff games will appear after the round robin is complete.
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Playoffs</h2>
          <p className="text-sm text-slate-600">Final placement games from the round-robin table.</p>
        </div>
        <span className="text-sm font-bold text-slate-500">
          {placementFixtures.length || bracket.length} games
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {placementFixtures.length > 0
          ? placementFixtures.map((fixture) => (
              <MiniFixtureCard key={fixture.id} fixture={fixture} teams={teams} />
            ))
          : bracket.map((match) => (
              <div key={match.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase text-slate-500">
                  <span>{match.label}</span>
                  <span>{formatTime(match.startsAt)}</span>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-950">
                  {match.homeSeed} vs {match.awaySeed}
                </p>
                <p className="mt-1 text-xs text-slate-500">{match.pitch}</p>
              </div>
            ))}
      </div>
    </section>
  );
}

type FinalPlacement = {
  position: number;
  teamId: string;
  teamName: string;
  source: string;
};

function FinalPlacementsList({ placements }: { placements: FinalPlacement[] }) {
  return (
    <ol className="space-y-2">
      {placements.map((placement) => (
        <li
          key={placement.teamId}
          className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3"
        >
          <span
            className={`grid size-8 shrink-0 place-items-center rounded text-sm font-black ${
              placement.position === 1
                ? "bg-amber-100 text-amber-800"
                : "bg-white text-slate-700"
            }`}
          >
            {placement.position}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-950">{placement.teamName}</span>
            <span className="block truncate text-xs font-medium text-slate-500">{placement.source}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function getFinalPlacements(
  standings: Standing[],
  placementFixtures: Fixture[],
  teams: Team[],
): FinalPlacement[] {
  if (placementFixtures.length === 0) {
    return [];
  }

  const allPlacementGamesDecided = placementFixtures.every(
    (fixture) =>
      fixture.homeRuns !== undefined &&
      fixture.awayRuns !== undefined &&
      fixture.homeRuns !== fixture.awayRuns,
  );

  if (!allPlacementGamesDecided) {
    return [];
  }

  const placements = new Map<number, FinalPlacement>();
  const placedTeamIds = new Set<string>();

  const placeFromFixture = (fixture: Fixture | undefined, winnerPosition: number, loserPosition: number) => {
    if (!fixture || fixture.homeRuns === undefined || fixture.awayRuns === undefined) {
      return;
    }

    const homeWon = fixture.homeRuns > fixture.awayRuns;
    const winnerId = homeWon ? fixture.homeTeamId : fixture.awayTeamId;
    const loserId = homeWon ? fixture.awayTeamId : fixture.homeTeamId;
    const source = getPlacementSource(fixture.stage);

    placements.set(winnerPosition, {
      position: winnerPosition,
      source,
      teamId: winnerId,
      teamName: teamName(teams, winnerId),
    });
    placements.set(loserPosition, {
      position: loserPosition,
      source,
      teamId: loserId,
      teamName: teamName(teams, loserId),
    });
    placedTeamIds.add(winnerId);
    placedTeamIds.add(loserId);
  };

  placeFromFixture(placementFixtures.find((fixture) => fixture.stage === "final"), 1, 2);
  placeFromFixture(placementFixtures.find((fixture) => fixture.stage === "third-place"), 3, 4);
  placeFromFixture(placementFixtures.find((fixture) => fixture.stage === "fifth-place"), 5, 6);

  let nextPosition = 1;

  for (const row of standings) {
    if (placedTeamIds.has(row.teamId)) {
      continue;
    }

    while (placements.has(nextPosition)) {
      nextPosition += 1;
    }

    placements.set(nextPosition, {
      position: nextPosition,
      source: "Round-robin position",
      teamId: row.teamId,
      teamName: row.teamName,
    });
  }

  return [...placements.values()].sort((a, b) => a.position - b.position);
}

function getPlacementSource(stage: Fixture["stage"]) {
  if (stage === "final") {
    return "Final";
  }

  if (stage === "third-place") {
    return "3rd place game";
  }

  if (stage === "fifth-place") {
    return "5th place game";
  }

  return "Placement game";
}
