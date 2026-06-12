import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local before seeding.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tournamentData = {
  slug: "pop-icons-2026",
  name: "Pop Icons",
  startsOn: new Date("2026-08-22T00:00:00.000Z"),
  venue: "Ward Park, Bangor",
  city: "Bangor",
  format: "round-robin-playoffs",
  status: "live",
  gameMinutes: 45,
  slotGapMinutes: 0,
  checkInAt: new Date("2026-08-22T08:45:00.000Z"),
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  announcements: [
    "Captains meeting at 09:15 beside the main desk.",
    "Please report scores straight after each game.",
  ],
};

const teamData = [
  {
    name: "Diamond Dogs",
    shortName: "DOG",
    colour: "#e11d48",
    contactName: "Alex Morgan",
    players: [
      ["Megan Brown", 7],
      ["Chris Walsh", 12],
      ["Niamh Kelly", 21],
      ["Ben Foster", 44],
    ],
  },
  {
    name: "Material Girls",
    shortName: "MAT",
    colour: "#7c3aed",
    contactName: "Sam Taylor",
    players: [
      ["Avery Kane", 5],
      ["Taylor Moore", 18],
      ["Erin Campbell", 27],
      ["Dylan Price", 2],
    ],
  },
  {
    name: "Purple Reign",
    shortName: "PUR",
    colour: "#2563eb",
    contactName: "Jordan Lee",
    players: [
      ["Jamie Bell", 9],
      ["Casey Grant", 22],
      ["Marta Vega", 11],
      ["Sean Devlin", 16],
    ],
  },
  {
    name: "Queen Bees",
    shortName: "BEE",
    colour: "#f59e0b",
    contactName: "Riley Quinn",
    players: [
      ["Morgan Reid", 3],
      ["Robin Shaw", 14],
      ["Grace Wilson", 8],
      ["Conor Hughes", 31],
    ],
  },
];

async function main() {
  const tournament = await prisma.tournament.upsert({
    where: { slug: tournamentData.slug },
    update: tournamentData,
    create: tournamentData,
  });

  await prisma.bracketMatch.deleteMany({ where: { tournamentId: tournament.id } });
  await prisma.fixture.deleteMany({ where: { tournamentId: tournament.id } });
  await prisma.player.deleteMany({ where: { team: { tournamentId: tournament.id } } });
  await prisma.team.deleteMany({ where: { tournamentId: tournament.id } });
  await prisma.pitch.deleteMany({ where: { tournamentId: tournament.id } });

  const [diamondOne, diamondTwo] = await Promise.all([
    prisma.pitch.create({
      data: { tournamentId: tournament.id, name: "Diamond 1", sortOrder: 1 },
    }),
    prisma.pitch.create({
      data: { tournamentId: tournament.id, name: "Diamond 2", sortOrder: 2 },
    }),
  ]);

  const teams = {};

  for (const team of teamData) {
    const createdTeam = await prisma.team.create({
      data: {
        tournamentId: tournament.id,
        name: team.name,
        shortName: team.shortName,
        colour: team.colour,
        contactName: team.contactName,
        players: {
          create: team.players.map(([name, shirtNumber]) => ({
            name,
            shirtNumber,
          })),
        },
      },
    });

    teams[team.shortName] = createdTeam;
  }

  await prisma.fixture.createMany({
    data: [
      {
        tournamentId: tournament.id,
        round: 1,
        startsAt: new Date("2026-08-22T09:45:00.000Z"),
        pitchId: diamondOne.id,
        homeTeamId: teams.DOG.id,
        awayTeamId: teams.BEE.id,
        stage: "group",
        homeRuns: 12,
        awayRuns: 8,
      },
      {
        tournamentId: tournament.id,
        round: 1,
        startsAt: new Date("2026-08-22T09:45:00.000Z"),
        pitchId: diamondTwo.id,
        homeTeamId: teams.MAT.id,
        awayTeamId: teams.PUR.id,
        stage: "group",
        homeRuns: 10,
        awayRuns: 10,
      },
      {
        tournamentId: tournament.id,
        round: 2,
        startsAt: new Date("2026-08-22T10:35:00.000Z"),
        pitchId: diamondOne.id,
        homeTeamId: teams.PUR.id,
        awayTeamId: teams.DOG.id,
        stage: "group",
      },
      {
        tournamentId: tournament.id,
        round: 2,
        startsAt: new Date("2026-08-22T10:35:00.000Z"),
        pitchId: diamondTwo.id,
        homeTeamId: teams.BEE.id,
        awayTeamId: teams.MAT.id,
        stage: "group",
      },
      {
        tournamentId: tournament.id,
        round: 3,
        startsAt: new Date("2026-08-22T11:25:00.000Z"),
        pitchId: diamondOne.id,
        homeTeamId: teams.DOG.id,
        awayTeamId: teams.MAT.id,
        stage: "group",
      },
      {
        tournamentId: tournament.id,
        round: 3,
        startsAt: new Date("2026-08-22T11:25:00.000Z"),
        pitchId: diamondTwo.id,
        homeTeamId: teams.PUR.id,
        awayTeamId: teams.BEE.id,
        stage: "group",
      },
    ],
  });

  const completedFixtures = await prisma.fixture.findMany({
    where: {
      tournamentId: tournament.id,
      homeRuns: { not: null },
      awayRuns: { not: null },
    },
    include: {
      awayTeam: true,
      homeTeam: true,
    },
    orderBy: [{ startsAt: "asc" }, { pitch: { sortOrder: "asc" } }],
  });

  const mvpNamesByTeam = {
    BEE: "Morgan Reid",
    DOG: "Megan Brown",
    MAT: "Avery Kane",
    PUR: "Jamie Bell",
  };

  await prisma.mvpVote.createMany({
    data: completedFixtures.flatMap((fixture) => [
      {
        tournamentId: tournament.id,
        fixtureId: fixture.id,
        teamId: fixture.homeTeamId,
        playerName: mvpNamesByTeam[fixture.homeTeam.shortName],
      },
      {
        tournamentId: tournament.id,
        fixtureId: fixture.id,
        teamId: fixture.awayTeamId,
        playerName: mvpNamesByTeam[fixture.awayTeam.shortName],
      },
    ]),
  });

  await prisma.bracketMatch.createMany({
    data: [
      {
        tournamentId: tournament.id,
        label: "Semi-final 1",
        stage: "semi-final",
        startsAt: new Date("2026-08-22T12:25:00.000Z"),
        pitchId: diamondOne.id,
        homeSeed: "1st",
        awaySeed: "4th",
        sortOrder: 1,
      },
      {
        tournamentId: tournament.id,
        label: "Semi-final 2",
        stage: "semi-final",
        startsAt: new Date("2026-08-22T12:25:00.000Z"),
        pitchId: diamondTwo.id,
        homeSeed: "2nd",
        awaySeed: "3rd",
        sortOrder: 2,
      },
      {
        tournamentId: tournament.id,
        label: "Final",
        stage: "final",
        startsAt: new Date("2026-08-22T13:20:00.000Z"),
        pitchId: diamondOne.id,
        homeSeed: "SF1 winner",
        awaySeed: "SF2 winner",
        sortOrder: 3,
      },
    ],
  });

  console.log("Seeded Pop Icons with teams, players, fixtures, and bracket matches.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
