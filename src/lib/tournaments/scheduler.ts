import { Fixture, Team, Tournament } from "./types";

type GenerateOptions = {
  tournament: Tournament;
  teams: Team[];
  firstPitch: string;
};

type GeneratePlacementOptions = {
  rankedTeams: Team[];
  tournament: Tournament;
  firstPitch: string;
  includeFifthPlaceGame: boolean;
};

export function generateRoundRobinSchedule({
  tournament,
  teams,
  firstPitch,
}: GenerateOptions): Fixture[] {
  const competitors = teams.length % 2 === 0 ? [...teams] : [...teams, null];
  const rounds = competitors.length - 1;
  const half = competitors.length / 2;
  const fixtures: Fixture[] = [];
  const firstStart = new Date(firstPitch);
  const slotMinutes = tournament.gameMinutes + tournament.slotGapMinutes;

  for (let round = 0; round < rounds; round += 1) {
    const roundPairings: Array<[Team, Team]> = [];

    for (let index = 0; index < half; index += 1) {
      const home = competitors[index];
      const away = competitors[competitors.length - 1 - index];

      if (home && away) {
        roundPairings.push(round % 2 === 0 ? [home, away] : [away, home]);
      }
    }

    roundPairings.forEach(([home, away], pairingIndex) => {
      const slot = Math.floor(fixtures.length / tournament.pitches.length);
      const startsAt = new Date(firstStart);
      startsAt.setMinutes(firstStart.getMinutes() + slot * slotMinutes);

      fixtures.push({
        id: `${tournament.id}-r${round + 1}-g${pairingIndex + 1}`,
        tournamentId: tournament.id,
        round: round + 1,
        startsAt: startsAt.toISOString(),
        pitch: tournament.pitches[fixtures.length % tournament.pitches.length],
        homeTeamId: home.id,
        awayTeamId: away.id,
        stage: "group",
      });
    });

    const fixed = competitors[0];
    const rotating = competitors.slice(1);
    rotating.unshift(rotating.pop() ?? null);
    competitors.splice(0, competitors.length, fixed, ...rotating);
  }

  return fixtures;
}

export function generatePlacementPlayoffs({
  firstPitch,
  includeFifthPlaceGame,
  rankedTeams,
  tournament,
}: GeneratePlacementOptions): Fixture[] {
  const placementGames: Array<{
    awayIndex: number;
    homeIndex: number;
    stage: Extract<Fixture["stage"], "final" | "third-place" | "fifth-place">;
  }> = [
    { awayIndex: 1, homeIndex: 0, stage: "final" as const },
  ];

  if (rankedTeams.length >= 4) {
    placementGames.push({ awayIndex: 3, homeIndex: 2, stage: "third-place" as const });
  }

  if (includeFifthPlaceGame) {
    placementGames.push({ awayIndex: 5, homeIndex: 4, stage: "fifth-place" as const });
  }

  if (rankedTeams.length < 3) {
    throw new Error("At least three ranked teams are needed to generate placement playoffs.");
  }

  if (includeFifthPlaceGame && rankedTeams.length < 6) {
    throw new Error("At least six ranked teams are needed for a 5th/6th place playoff.");
  }

  if (tournament.pitches.length < placementGames.length) {
    throw new Error(`Add at least ${placementGames.length} pitches before generating these placement games.`);
  }

  const startsAt = new Date(firstPitch).toISOString();

  return placementGames.map((game, index) => ({
    id: `${tournament.id}-${game.stage}`,
    tournamentId: tournament.id,
    round: 99,
    startsAt,
    pitch: tournament.pitches[index],
    homeTeamId: rankedTeams[game.homeIndex].id,
    awayTeamId: rankedTeams[game.awayIndex].id,
    stage: game.stage,
  }));
}
