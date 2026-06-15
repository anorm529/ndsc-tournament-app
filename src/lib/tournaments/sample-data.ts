import { calculateStandings } from "./standings";
import { BracketMatch, Fixture, Player, Team, Tournament } from "./types";

export const tournament: Tournament = {
  id: "pop-icons-2026",
  slug: "pop-icons-2026",
  name: "Pop Icons",
  date: "2026-08-22",
  venue: "Ward Park, Bangor",
  city: "Bangor",
  format: "round-robin-playoffs",
  status: "live",
  tournamentType: "public",
  seasonYear: 2026,
  mvpMode: "gendered",
  pitches: ["Diamond 1", "Diamond 2"],
  gameMinutes: 45,
  slotGapMinutes: 0,
  schedulePublished: true,
  checkInTime: "2026-08-22T08:45:00.000Z",
  points: {
    win: 3,
    draw: 1,
    loss: 0,
  },
  announcements: [
    "Captains meeting at 09:15 beside the main desk.",
    "Please report scores straight after each game.",
  ],
};

export const teams: Team[] = [
  {
    id: "team-bowie",
    tournamentId: tournament.id,
    name: "Diamond Dogs",
    shortName: "DOG",
    colour: "#e11d48",
    contactName: "Alex Morgan",
  },
  {
    id: "team-madonna",
    tournamentId: tournament.id,
    name: "Material Girls",
    shortName: "MAT",
    colour: "#7c3aed",
    contactName: "Sam Taylor",
  },
  {
    id: "team-prince",
    tournamentId: tournament.id,
    name: "Purple Reign",
    shortName: "PUR",
    colour: "#2563eb",
    contactName: "Jordan Lee",
  },
  {
    id: "team-beyonce",
    tournamentId: tournament.id,
    name: "Queen Bees",
    shortName: "BEE",
    colour: "#f59e0b",
    contactName: "Riley Quinn",
  },
];

export const players: Player[] = [
  { id: "p-1", teamId: "team-bowie", name: "Megan Brown", shirtNumber: 7 },
  { id: "p-2", teamId: "team-bowie", name: "Chris Walsh", shirtNumber: 12 },
  { id: "p-9", teamId: "team-bowie", name: "Niamh Kelly", shirtNumber: 21 },
  { id: "p-10", teamId: "team-bowie", name: "Ben Foster", shirtNumber: 44 },
  { id: "p-3", teamId: "team-madonna", name: "Avery Kane", shirtNumber: 5 },
  { id: "p-4", teamId: "team-madonna", name: "Taylor Moore", shirtNumber: 18 },
  { id: "p-11", teamId: "team-madonna", name: "Erin Campbell", shirtNumber: 27 },
  { id: "p-12", teamId: "team-madonna", name: "Dylan Price", shirtNumber: 2 },
  { id: "p-5", teamId: "team-prince", name: "Jamie Bell", shirtNumber: 9 },
  { id: "p-6", teamId: "team-prince", name: "Casey Grant", shirtNumber: 22 },
  { id: "p-13", teamId: "team-prince", name: "Marta Vega", shirtNumber: 11 },
  { id: "p-14", teamId: "team-prince", name: "Sean Devlin", shirtNumber: 16 },
  { id: "p-7", teamId: "team-beyonce", name: "Morgan Reid", shirtNumber: 3 },
  { id: "p-8", teamId: "team-beyonce", name: "Robin Shaw", shirtNumber: 14 },
  { id: "p-15", teamId: "team-beyonce", name: "Grace Wilson", shirtNumber: 8 },
  { id: "p-16", teamId: "team-beyonce", name: "Conor Hughes", shirtNumber: 31 },
];

export const fixtures: Fixture[] = [
  {
    id: "f-1",
    tournamentId: tournament.id,
    round: 1,
    startsAt: "2026-08-22T09:45:00.000Z",
    pitch: "Diamond 1",
    homeTeamId: "team-bowie",
    awayTeamId: "team-beyonce",
    stage: "group",
    homeRuns: 12,
    awayRuns: 8,
  },
  {
    id: "f-2",
    tournamentId: tournament.id,
    round: 1,
    startsAt: "2026-08-22T09:45:00.000Z",
    pitch: "Diamond 2",
    homeTeamId: "team-madonna",
    awayTeamId: "team-prince",
    stage: "group",
    homeRuns: 10,
    awayRuns: 10,
  },
  {
    id: "f-3",
    tournamentId: tournament.id,
    round: 2,
    startsAt: "2026-08-22T10:35:00.000Z",
    pitch: "Diamond 1",
    homeTeamId: "team-prince",
    awayTeamId: "team-bowie",
    stage: "group",
  },
  {
    id: "f-4",
    tournamentId: tournament.id,
    round: 2,
    startsAt: "2026-08-22T10:35:00.000Z",
    pitch: "Diamond 2",
    homeTeamId: "team-beyonce",
    awayTeamId: "team-madonna",
    stage: "group",
  },
  {
    id: "f-5",
    tournamentId: tournament.id,
    round: 3,
    startsAt: "2026-08-22T11:25:00.000Z",
    pitch: "Diamond 1",
    homeTeamId: "team-bowie",
    awayTeamId: "team-madonna",
    stage: "group",
  },
  {
    id: "f-6",
    tournamentId: tournament.id,
    round: 3,
    startsAt: "2026-08-22T11:25:00.000Z",
    pitch: "Diamond 2",
    homeTeamId: "team-prince",
    awayTeamId: "team-beyonce",
    stage: "group",
  },
];

export const standings = calculateStandings(tournament, teams, fixtures);

export const bracket: BracketMatch[] = [
  {
    id: "sf-1",
    label: "Semi-final 1",
    startsAt: "2026-08-22T12:25:00.000Z",
    pitch: "Diamond 1",
    homeSeed: "1st",
    awaySeed: "4th",
    stage: "semi-final",
  },
  {
    id: "sf-2",
    label: "Semi-final 2",
    startsAt: "2026-08-22T12:25:00.000Z",
    pitch: "Diamond 2",
    homeSeed: "2nd",
    awaySeed: "3rd",
    stage: "semi-final",
  },
  {
    id: "final",
    label: "Final",
    startsAt: "2026-08-22T13:20:00.000Z",
    pitch: "Diamond 1",
    homeSeed: "SF1 winner",
    awaySeed: "SF2 winner",
    stage: "final",
  },
];

export function getTeam(teamId: string) {
  return teams.find((team) => team.id === teamId);
}

export const tournaments: Tournament[] = [
  tournament,
  {
    id: "leading-ladies-2026",
    slug: "leading-ladies-2026",
    name: "Leading Ladies",
    date: "2026-09-12",
    venue: "Ward Park, Bangor",
    city: "Bangor",
    format: "round-robin",
    status: "draft",
    tournamentType: "public",
    seasonYear: 2026,
    mvpMode: "overall",
    pitches: ["Diamond 1", "Diamond 2", "Diamond 3"],
    gameMinutes: 40,
    slotGapMinutes: 10,
    schedulePublished: false,
    checkInTime: "2026-09-12T08:30:00.000Z",
    points: {
      win: 3,
      draw: 1,
      loss: 0,
    },
    announcements: ["Draft event template. Registration list is still open."],
  },
];
