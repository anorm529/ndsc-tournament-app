import { Fixture, Standing, Team, Tournament } from "./types";

export function calculateStandings(
  tournament: Tournament,
  teams: Team[],
  fixtures: Fixture[],
): Standing[] {
  const rows = new Map<string, Standing>();

  teams.forEach((team) => {
    rows.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      runsFor: 0,
      runsAgainst: 0,
      runDifference: 0,
    });
  });

  fixtures
    .filter((fixture) => fixture.homeRuns !== undefined && fixture.awayRuns !== undefined)
    .forEach((fixture) => {
      const home = rows.get(fixture.homeTeamId);
      const away = rows.get(fixture.awayTeamId);

      if (!home || !away || fixture.homeRuns === undefined || fixture.awayRuns === undefined) {
        return;
      }

      home.played += 1;
      away.played += 1;
      home.runsFor += fixture.homeRuns;
      home.runsAgainst += fixture.awayRuns;
      away.runsFor += fixture.awayRuns;
      away.runsAgainst += fixture.homeRuns;

      if (fixture.homeRuns > fixture.awayRuns) {
        home.wins += 1;
        away.losses += 1;
        home.points += tournament.points.win;
        away.points += tournament.points.loss;
      } else if (fixture.homeRuns < fixture.awayRuns) {
        away.wins += 1;
        home.losses += 1;
        away.points += tournament.points.win;
        home.points += tournament.points.loss;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += tournament.points.draw;
        away.points += tournament.points.draw;
      }

      home.runDifference = home.runsFor - home.runsAgainst;
      away.runDifference = away.runsFor - away.runsAgainst;
    });

  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.runDifference !== a.runDifference) return b.runDifference - a.runDifference;
    if (b.runsFor !== a.runsFor) return b.runsFor - a.runsFor;
    return a.teamName.localeCompare(b.teamName);
  });
}
