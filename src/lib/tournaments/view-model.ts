import { Fixture, Team } from "./types";

export function teamById(teams: Team[], teamId: string) {
  return teams.find((team) => team.id === teamId);
}

export function teamName(teams: Team[], teamId: string) {
  return teamById(teams, teamId)?.name ?? "TBC";
}

export function teamShortName(teams: Team[], teamId: string) {
  return teamById(teams, teamId)?.shortName ?? "TBC";
}

export function rosterForTeam<TPlayer extends { teamId: string }>(players: TPlayer[], teamId: string) {
  return players.filter((player) => player.teamId === teamId);
}

export function fixturesForTeam(fixtures: Fixture[], teamId: string) {
  return fixtures.filter(
    (fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId,
  );
}

export function isFixtureComplete(fixture: Fixture) {
  return fixture.homeRuns !== undefined && fixture.awayRuns !== undefined;
}

export function groupFixturesBySlot(items: Fixture[]) {
  return items.reduce<Record<string, Fixture[]>>((groups, fixture) => {
    groups[fixture.startsAt] ??= [];
    groups[fixture.startsAt].push(fixture);
    return groups;
  }, {});
}

export function teamRosterSummary(team: Team) {
  return team.name;
}
