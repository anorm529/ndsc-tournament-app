import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";

import { calculateStandings } from "./standings";
import {
  BracketMatch,
  Fixture,
  InternalSeasonLeaderboard,
  InternalSeasonMvpRow,
  InternalSeasonTeamRow,
  MvpCategory,
  MvpLeader,
  MvpVote,
  Player,
  ScheduleBlock,
  Team,
  Tournament,
  TournamentCard,
} from "./types";

type TournamentRecord = Awaited<ReturnType<typeof prisma.tournament.findFirstOrThrow>>;

export type TournamentBundle = {
  tournament: Tournament;
  tournaments?: Tournament[];
  teams: Team[];
  players: Player[];
  fixtures: Fixture[];
  bracket: BracketMatch[];
  scheduleBlocks: ScheduleBlock[];
  mvpVotes: MvpVote[];
  mvpLeaders: MvpLeader[];
  standings: ReturnType<typeof calculateStandings>;
};

export async function getTournaments(): Promise<Tournament[]> {
  const tournaments = await prisma.tournament.findMany({
    include: {
      pitches: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ startsOn: "asc" }, { name: "asc" }],
  });

  return tournaments.map(mapTournament);
}

export const getTournamentCards = unstable_cache(
  async (): Promise<TournamentCard[]> => _getTournamentCards(),
  ["tournament-cards"],
  { revalidate: 20, tags: ["tournament-cards"] },
);

async function _getTournamentCards(): Promise<TournamentCard[]> {
  const events = await prisma.tournament.findMany({
    include: {
      _count: {
        select: {
          fixtures: true,
          teams: true,
        },
      },
      fixtures: {
        select: {
          awayRuns: true,
          homeRuns: true,
        },
      },
      pitches: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ startsOn: "asc" }, { name: "asc" }],
  });
  const now = new Date();
  const liveEvents = events.filter((event) => event.status === "live");
  const nextEvent =
    liveEvents[0] ??
    events.find((event) => event.startsOn >= now && event.status !== "complete");

  return events
    .map((event) => {
      const tournament = mapTournament(event);
      const playedFixturesCount = event.fixtures.filter(
        (fixture) => fixture.homeRuns !== null && fixture.awayRuns !== null,
      ).length;

      return {
        ...tournament,
        teamsCount: event._count.teams,
        fixturesCount: event._count.fixtures,
        playedFixturesCount,
        priority: getTournamentPriority(event.id, nextEvent?.id, event.startsOn, event.status),
      };
    })
    .sort(sortTournamentCards);
}

export async function getInternalSeasonLeaderboard(
  seasonYear = new Date().getFullYear(),
): Promise<InternalSeasonLeaderboard> {
  const events = await getTournamentCards();
  const internalCards = events.filter(
    (event) => event.tournamentType === "internal" && event.seasonYear === seasonYear,
  );

  const tournaments = await Promise.all(
    internalCards.map((event) => getTournamentBundle(event.slug)),
  );
  const teamRows = calculateInternalTeamRows(tournaments);
  const mvpRows = calculateInternalMvpRows(tournaments.flatMap((event) => event.mvpVotes), tournaments.flatMap((event) => event.teams));

  return {
    seasonYear,
    tournaments: internalCards,
    teamRows,
    mvpRows,
  };
}

export async function getActiveTournamentBundle(): Promise<TournamentBundle> {
  const slug = await getActiveTournamentSlug();

  if (!slug) {
    throw new Error("No active tournaments found.");
  }

  return getTournamentBundle(slug);
}

export async function getActiveTournamentSlug(): Promise<string | null> {
  const event = await prisma.tournament.findFirst({
    orderBy: [{ startsOn: "asc" }, { name: "asc" }],
    where: {
      status: {
        in: ["published", "live", "draft"],
      },
    },
  });

  return event?.slug ?? null;
}

export const getTournamentBundle = unstable_cache(
  async (slug: string): Promise<TournamentBundle> => _getTournamentBundle(slug),
  ["tournament-bundle"],
  { revalidate: 10, tags: ["tournament-bundle"] },
);

async function _getTournamentBundle(slug: string): Promise<TournamentBundle> {
  const event = await prisma.tournament.findUniqueOrThrow({
    where: { slug },
    include: {
      bracketMatches: {
        include: { pitch: true },
        orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
      },
      scheduleBlocks: {
        orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }],
      },
      fixtures: {
        include: {
          pitch: true,
          umpireAssignments: {
            include: { umpire: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ startsAt: "asc" }, { pitch: { sortOrder: "asc" } }],
      },
      mvpVotes: {
        include: { team: true },
        orderBy: [{ playerName: "asc" }],
      },
      pitches: {
        orderBy: { sortOrder: "asc" },
      },
      teams: {
        include: {
          players: {
            orderBy: [{ shirtNumber: "asc" }, { name: "asc" }],
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  const tournament = mapTournament(event);
  const teams = event.teams.map(mapTeam);
  const players = event.teams.flatMap((team) => team.players.map(mapPlayer));
  const fixtures = event.fixtures.map(mapFixture);
  const bracket = event.bracketMatches.map(mapBracketMatch);
  const scheduleBlocks = event.scheduleBlocks.map(mapScheduleBlock);
  const mvpVotes = event.mvpVotes.map(mapMvpVote);
  const mvpLeaders = calculateMvpLeaders(mvpVotes, teams);
  const standings = calculateStandings(
    tournament,
    teams,
    fixtures.filter((fixture) => fixture.stage === "group"),
  );

  return {
    tournament,
    teams,
    players,
    fixtures,
    bracket,
    scheduleBlocks,
    mvpVotes,
    mvpLeaders,
    standings,
  };
}

export function mapTournament(
  record: TournamentRecord & {
    pitches?: Array<{ name: string }>;
  },
): Tournament {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    date: record.startsOn.toISOString(),
    endDate: record.endsOn?.toISOString(),
    venue: record.venue,
    city: record.city,
    format: record.format as Tournament["format"],
    status: record.status as Tournament["status"],
    tournamentType: record.tournamentType as Tournament["tournamentType"],
    seasonYear: record.seasonYear,
    mvpMode: record.mvpMode as Tournament["mvpMode"],
    pitches: record.pitches?.map((pitch) => pitch.name) ?? [],
    gameMinutes: record.gameMinutes,
    slotGapMinutes: record.slotGapMinutes,
    schedulePublished: record.schedulePublished,
    checkInTime: record.checkInAt?.toISOString() ?? record.startsOn.toISOString(),
    points: {
      win: record.winPoints,
      draw: record.drawPoints,
      loss: record.lossPoints,
    },
    announcements: record.announcements,
  };
}

function mapTeam(record: {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string;
  colour: string;
  contactName: string | null;
  contactEmail: string | null;
  checkedInAt: Date | null;
}): Team {
  return {
    id: record.id,
    tournamentId: record.tournamentId,
    name: record.name,
    shortName: record.shortName,
    colour: record.colour,
    contactName: record.contactName ?? undefined,
    contactEmail: record.contactEmail ?? undefined,
    checkedInAt: record.checkedInAt?.toISOString(),
  };
}

function mapPlayer(record: {
  id: string;
  teamId: string;
  name: string;
  shirtNumber: number | null;
}): Player {
  return {
    id: record.id,
    teamId: record.teamId,
    name: record.name,
    shirtNumber: record.shirtNumber ?? undefined,
  };
}

function mapFixture(record: {
  id: string;
  tournamentId: string;
  round: number;
  startsAt: Date;
  pitch: { name: string } | null;
  homeTeamId: string;
  awayTeamId: string;
  stage: string;
  homeRuns: number | null;
  awayRuns: number | null;
  umpireAssignments?: Array<{
    role: string;
    umpire: {
      id: string;
      name: string;
    };
  }>;
}): Fixture {
  return {
    id: record.id,
    tournamentId: record.tournamentId,
    round: record.round,
    startsAt: record.startsAt.toISOString(),
    pitch: record.pitch?.name ?? "TBC",
    homeTeamId: record.homeTeamId,
    awayTeamId: record.awayTeamId,
    stage: record.stage as Fixture["stage"],
    homeRuns: record.homeRuns ?? undefined,
    awayRuns: record.awayRuns ?? undefined,
    umpires: record.umpireAssignments?.map((assignment) => ({
      id: assignment.umpire.id,
      name: assignment.umpire.name,
      role: assignment.role,
    })) ?? [],
  };
}

function mapBracketMatch(record: {
  id: string;
  label: string;
  stage: string;
  startsAt: Date;
  pitch: { name: string } | null;
  homeSeed: string;
  awaySeed: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeRuns: number | null;
  awayRuns: number | null;
}): BracketMatch {
  return {
    id: record.id,
    label: record.label,
    stage: record.stage as BracketMatch["stage"],
    startsAt: record.startsAt.toISOString(),
    pitch: record.pitch?.name ?? "TBC",
    homeSeed: record.homeSeed,
    awaySeed: record.awaySeed,
    homeTeamId: record.homeTeamId ?? undefined,
    awayTeamId: record.awayTeamId ?? undefined,
    homeRuns: record.homeRuns ?? undefined,
    awayRuns: record.awayRuns ?? undefined,
  };
}

function mapScheduleBlock(record: {
  id: string;
  tournamentId: string;
  label: string;
  startsAt: Date;
  endsAt: Date;
}): ScheduleBlock {
  return {
    id: record.id,
    tournamentId: record.tournamentId,
    label: record.label,
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt.toISOString(),
  };
}

function mapMvpVote(record: {
  id: string;
  tournamentId: string;
  fixtureId: string;
  teamId: string;
  category: string;
  playerName: string;
}): MvpVote {
  return {
    id: record.id,
    tournamentId: record.tournamentId,
    fixtureId: record.fixtureId,
    teamId: record.teamId,
    category: record.category as MvpCategory,
    playerName: record.playerName,
  };
}

function getTournamentPriority(
  tournamentId: string,
  nextTournamentId: string | undefined,
  startsOn: Date,
  status: string,
): TournamentCard["priority"] {
  if (status === "live") {
    return "live";
  }

  if (tournamentId === nextTournamentId) {
    return "next";
  }

  if (status === "complete" || startsOn < new Date()) {
    return "past";
  }

  return "upcoming";
}

function sortTournamentCards(a: TournamentCard, b: TournamentCard) {
  const priorityOrder: Record<TournamentCard["priority"], number> = {
    live: 0,
    next: 1,
    upcoming: 2,
    past: 3,
  };
  const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  if (a.priority === "past" && b.priority === "past") {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }

  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function calculateMvpLeaders(votes: MvpVote[], teams: Team[]): MvpLeader[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const leaders = new Map<string, MvpLeader>();

  for (const vote of votes) {
    const normalizedPlayerName = vote.playerName.trim().replace(/\s+/g, " ");
    const key = `${vote.category}:${normalizedPlayerName.toLowerCase()}`;
    const teamName = teamsById.get(vote.teamId)?.name ?? "Unknown team";
    const existing = leaders.get(key);

    if (existing) {
      existing.votes += 1;
      if (!existing.teamNames.includes(teamName)) {
        existing.teamNames.push(teamName);
      }
    } else {
      leaders.set(key, {
        playerName: normalizedPlayerName,
        teamNames: [teamName],
        category: vote.category,
        votes: 1,
      });
    }
  }

  return [...leaders.values()].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    if (a.playerName !== b.playerName) return a.playerName.localeCompare(b.playerName);
    return a.teamNames[0].localeCompare(b.teamNames[0]);
  });
}

function calculateInternalTeamRows(tournaments: TournamentBundle[]): InternalSeasonTeamRow[] {
  const rows = new Map<string, InternalSeasonTeamRow>();

  for (const event of tournaments) {
    const placements = getCompletedFinalPlacements(event.standings, event.fixtures, event.teams);

    if (placements.length === 0) {
      continue;
    }

    for (const placement of placements) {
      const existing = rows.get(placement.teamName) ?? {
        teamName: placement.teamName,
        eventsPlayed: 0,
        wins: 0,
        topThreeFinishes: 0,
        points: 0,
      };

      existing.eventsPlayed += 1;
      existing.wins += placement.position === 1 ? 1 : 0;
      existing.topThreeFinishes += placement.position <= 3 ? 1 : 0;
      existing.points += getSeasonPoints(placement.position);
      rows.set(placement.teamName, existing);
    }
  }

  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.topThreeFinishes !== a.topThreeFinishes) return b.topThreeFinishes - a.topThreeFinishes;
    return a.teamName.localeCompare(b.teamName);
  });
}

function calculateInternalMvpRows(votes: MvpVote[], teams: Team[]): InternalSeasonMvpRow[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const rows = new Map<string, InternalSeasonMvpRow>();

  for (const vote of votes) {
    const playerName = vote.playerName.trim().replace(/\s+/g, " ");
    const teamName = teamsById.get(vote.teamId)?.name ?? "Unknown team";
    const key = `${vote.category}:${playerName.toLowerCase()}`;
    const existing = rows.get(key);

    if (existing) {
      existing.votes += 1;
      if (!existing.teamNames.includes(teamName)) {
        existing.teamNames.push(teamName);
      }
    } else {
      rows.set(key, { playerName, teamNames: [teamName], category: vote.category, votes: 1 });
    }
  }

  return [...rows.values()].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.playerName.localeCompare(b.playerName);
  });
}

type FinalPlacement = {
  position: number;
  teamId: string;
  teamName: string;
};

function getCompletedFinalPlacements(
  standings: TournamentBundle["standings"],
  fixtures: Fixture[],
  teams: Team[],
): FinalPlacement[] {
  const placementFixtures = fixtures.filter((fixture) =>
    fixture.stage === "final" || fixture.stage === "third-place" || fixture.stage === "fifth-place"
  );

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
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  const placeFromFixture = (fixture: Fixture | undefined, winnerPosition: number, loserPosition: number) => {
    if (!fixture || fixture.homeRuns === undefined || fixture.awayRuns === undefined) return;

    const homeWon = fixture.homeRuns > fixture.awayRuns;
    const winnerId = homeWon ? fixture.homeTeamId : fixture.awayTeamId;
    const loserId = homeWon ? fixture.awayTeamId : fixture.homeTeamId;

    placements.set(winnerPosition, {
      position: winnerPosition,
      teamId: winnerId,
      teamName: teamsById.get(winnerId)?.name ?? "Unknown team",
    });
    placements.set(loserPosition, {
      position: loserPosition,
      teamId: loserId,
      teamName: teamsById.get(loserId)?.name ?? "Unknown team",
    });
    placedTeamIds.add(winnerId);
    placedTeamIds.add(loserId);
  };

  placeFromFixture(placementFixtures.find((fixture) => fixture.stage === "final"), 1, 2);
  placeFromFixture(placementFixtures.find((fixture) => fixture.stage === "third-place"), 3, 4);
  placeFromFixture(placementFixtures.find((fixture) => fixture.stage === "fifth-place"), 5, 6);

  let nextPosition = 1;

  for (const row of standings) {
    if (placedTeamIds.has(row.teamId)) continue;

    while (placements.has(nextPosition)) {
      nextPosition += 1;
    }

    placements.set(nextPosition, {
      position: nextPosition,
      teamId: row.teamId,
      teamName: row.teamName,
    });
  }

  return [...placements.values()].sort((a, b) => a.position - b.position);
}

function getSeasonPoints(position: number) {
  const pointsByPosition = [10, 8, 6, 4, 2, 1];
  return pointsByPosition[position - 1] ?? 1;
}
