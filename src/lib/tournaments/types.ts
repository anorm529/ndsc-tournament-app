export type TournamentFormat = "round-robin" | "round-robin-playoffs";
export type TournamentType = "public" | "internal";
export type MvpMode = "overall" | "gendered";
export type MvpCategory = "overall" | "male" | "female";

export type Tournament = {
  id: string;
  slug: string;
  name: string;
  date: string;
  endDate?: string;
  venue: string;
  city: string;
  format: TournamentFormat;
  status: "draft" | "published" | "live" | "complete";
  tournamentType: TournamentType;
  seasonYear: number;
  mvpMode: MvpMode;
  pitches: string[];
  gameMinutes: number;
  slotGapMinutes: number;
  schedulePublished: boolean;
  checkInTime: string;
  points: {
    win: number;
    draw: number;
    loss: number;
  };
  announcements: string[];
};

export type Team = {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string;
  colour: string;
  contactName?: string;
  contactEmail?: string;
  checkedInAt?: string;
};

export type Player = {
  id: string;
  teamId: string;
  name: string;
  shirtNumber?: number;
};

export type Fixture = {
  id: string;
  tournamentId: string;
  round: number;
  startsAt: string;
  pitch: string;
  homeTeamId: string;
  awayTeamId: string;
  stage: "group" | "semi-final" | "final" | "third-place" | "fifth-place";
  homeRuns?: number;
  awayRuns?: number;
  umpires?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
};

export type BracketMatch = {
  id: string;
  label: string;
  startsAt: string;
  pitch: string;
  homeSeed: string;
  awaySeed: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeRuns?: number;
  awayRuns?: number;
  stage: "semi-final" | "final" | "third-place" | "fifth-place";
};

export type ScheduleBlock = {
  id: string;
  tournamentId: string;
  label: string;
  startsAt: string;
  endsAt: string;
};

export type MvpVote = {
  id: string;
  tournamentId: string;
  fixtureId: string;
  teamId: string;
  category: MvpCategory;
  playerName: string;
};

export type MvpLeader = {
  playerName: string;
  teamNames: string[];
  category: MvpCategory;
  votes: number;
};

export type TournamentCard = Tournament & {
  teamsCount: number;
  fixturesCount: number;
  playedFixturesCount: number;
  priority: "live" | "next" | "upcoming" | "past";
};

export type InternalSeasonTeamRow = {
  teamName: string;
  eventsPlayed: number;
  wins: number;
  topThreeFinishes: number;
  points: number;
};

export type InternalSeasonMvpRow = {
  playerName: string;
  teamNames: string[];
  category: MvpCategory;
  votes: number;
};

export type InternalSeasonLeaderboard = {
  seasonYear: number;
  tournaments: TournamentCard[];
  teamRows: InternalSeasonTeamRow[];
  mvpRows: InternalSeasonMvpRow[];
};

export type Umpire = {
  id: string;
  tournamentId: string;
  name: string;
  email?: string;
  phone?: string;
  availabilityNote?: string;
  defaultPitchId?: string;
  defaultPitchName?: string;
};

export type TournamentTemplate = {
  id: string;
  name: string;
  description?: string;
  teamCount: number;
  pitchCount: number;
  format: TournamentFormat;
  gameMinutes: number;
  slotGapMinutes: number;
  includeThirdPlace: boolean;
  includeFifthPlace: boolean;
};

export type AuditLog = {
  id: string;
  entityType: string;
  entityId?: string;
  action: string;
  summary: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  createdAt: string;
};

export type Standing = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
  runDifference: number;
};
