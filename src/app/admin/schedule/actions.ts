"use server";

import { refresh, revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { ActionState, errorState, successState } from "@/lib/action-state";
import { generatePlacementPlayoffs, generateRoundRobinSchedule } from "@/lib/tournaments/scheduler";
import { calculateStandings } from "@/lib/tournaments/standings";
import { Fixture, Team, Tournament } from "@/lib/tournaments/types";

export async function generateSchedule(_state: ActionState, formData: FormData) {
  try {
    const tournamentId = requireText(formData, "tournamentId");
    const firstPitch = requireText(formData, "firstPitch");
    const replaceExisting = formData.get("replaceExisting") === "on";

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: {
        fixtures: {
          where: { stage: "group" },
          select: { id: true, homeRuns: true, awayRuns: true },
        },
        pitches: {
          orderBy: { sortOrder: "asc" },
        },
        teams: {
          orderBy: { name: "asc" },
        },
      },
    });

    if (tournament.teams.length < 2) {
      throw new Error("Add at least two teams before generating a schedule.");
    }

    if (tournament.pitches.length < 1) {
      throw new Error("Add at least one pitch before generating a schedule.");
    }

    if (tournament.fixtures.length > 0 && !replaceExisting) {
      throw new Error("A group schedule already exists. Tick replace existing schedule to regenerate it.");
    }

    const hasScores = tournament.fixtures.some(
      (fixture) => fixture.homeRuns !== null || fixture.awayRuns !== null,
    );

    if (hasScores && !replaceExisting) {
      throw new Error("This schedule has scores. Tick replace existing schedule if you really want to clear them.");
    }

    const firstPitchDate = parseDatetimeLocal(firstPitch);
    const pitchIdsByName = new Map(tournament.pitches.map((pitch) => [pitch.name, pitch.id]));
    const generatedFixtures = generateRoundRobinSchedule({
      tournament: {
        id: tournament.id,
        slug: tournament.slug,
        name: tournament.name,
        date: tournament.startsOn.toISOString(),
        endDate: tournament.endsOn?.toISOString(),
        venue: tournament.venue,
        city: tournament.city,
        format: tournament.format as Tournament["format"],
        status: tournament.status as Tournament["status"],
        tournamentType: tournament.tournamentType as Tournament["tournamentType"],
        seasonYear: tournament.seasonYear,
        mvpMode: tournament.mvpMode as Tournament["mvpMode"],
        pitches: tournament.pitches.map((pitch) => pitch.name),
        gameMinutes: tournament.gameMinutes,
        slotGapMinutes: tournament.slotGapMinutes,
        checkInTime: tournament.checkInAt?.toISOString() ?? tournament.startsOn.toISOString(),
        points: {
          win: tournament.winPoints,
          draw: tournament.drawPoints,
          loss: tournament.lossPoints,
        },
        announcements: tournament.announcements,
      },
      teams: tournament.teams.map(
        (team): Team => ({
          id: team.id,
          tournamentId: team.tournamentId,
          name: team.name,
          shortName: team.shortName,
          colour: team.colour,
          contactName: team.contactName ?? undefined,
          contactEmail: team.contactEmail ?? undefined,
        }),
      ),
      firstPitch: firstPitchDate.toISOString(),
    });

    await prisma.$transaction([
      prisma.fixture.deleteMany({
        where: {
          tournamentId: tournament.id,
          stage: {
            in: ["group", "final", "third-place", "fifth-place"],
          },
        },
      }),
      prisma.fixture.createMany({
        data: generatedFixtures.map((fixture) => ({
          tournamentId: tournament.id,
          round: fixture.round,
          startsAt: new Date(fixture.startsAt),
          pitchId: pitchIdsByName.get(fixture.pitch),
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          stage: "group",
        })),
      }),
    ]);

    revalidateSchedulePages(tournament.slug);
    refresh();
    return successState(`${generatedFixtures.length} fixtures were generated.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function generatePlacementSchedule(_state: ActionState, formData: FormData) {
  try {
    const tournamentId = requireText(formData, "tournamentId");
    const firstPitch = requireText(formData, "placementFirstPitch");
    const includeFifthPlaceGame = formData.get("includeFifthPlaceGame") === "on";
    const replaceExisting = formData.get("replaceExistingPlacement") === "on";

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: {
        fixtures: {
          include: { pitch: true },
          orderBy: [{ startsAt: "asc" }, { pitch: { sortOrder: "asc" } }],
        },
        pitches: {
          orderBy: { sortOrder: "asc" },
        },
        teams: {
          orderBy: { name: "asc" },
        },
      },
    });

    const groupFixtures = tournament.fixtures.filter((fixture) => fixture.stage === "group");
    const placementFixtures = tournament.fixtures.filter((fixture) => isPlacementStage(fixture.stage));

    if (tournament.teams.length < 4) {
      throw new Error("Add at least four teams before generating placement playoffs.");
    }

    if (groupFixtures.length === 0) {
      throw new Error("Generate the round-robin schedule before generating placement playoffs.");
    }

    const hasIncompleteGroupGame = groupFixtures.some(
      (fixture) => fixture.homeRuns === null || fixture.awayRuns === null,
    );

    if (hasIncompleteGroupGame) {
      throw new Error("Enter scores for every round-robin game before generating placement playoffs.");
    }

    if (placementFixtures.length > 0 && !replaceExisting) {
      throw new Error("Placement games already exist. Tick replace existing placement games to regenerate them.");
    }

    const hasPlacementScores = placementFixtures.some(
      (fixture) => fixture.homeRuns !== null || fixture.awayRuns !== null,
    );

    if (hasPlacementScores && !replaceExisting) {
      throw new Error("These placement games have scores. Tick replace existing placement games if you really want to clear them.");
    }

    const tournamentView = mapTournamentView(tournament);
    const teams = tournament.teams.map(mapTeamView);
    const standings = calculateStandings(
      tournamentView,
      teams,
      groupFixtures.map(mapFixtureView),
    );
    const teamsById = new Map(teams.map((team) => [team.id, team]));
    const rankedTeams = standings
      .map((row) => teamsById.get(row.teamId))
      .filter((team): team is Team => Boolean(team));

    const generatedFixtures = generatePlacementPlayoffs({
      firstPitch: parseDatetimeLocal(firstPitch).toISOString(),
      includeFifthPlaceGame,
      rankedTeams,
      tournament: tournamentView,
    });
    const pitchIdsByName = new Map(tournament.pitches.map((pitch) => [pitch.name, pitch.id]));

    await prisma.$transaction([
      prisma.fixture.deleteMany({
        where: {
          tournamentId: tournament.id,
          stage: {
            in: ["final", "third-place", "fifth-place"],
          },
        },
      }),
      prisma.fixture.createMany({
        data: generatedFixtures.map((fixture) => ({
          tournamentId: tournament.id,
          round: fixture.round,
          startsAt: new Date(fixture.startsAt),
          pitchId: pitchIdsByName.get(fixture.pitch),
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          stage: fixture.stage,
        })),
      }),
    ]);

    revalidateSchedulePages(tournament.slug);
    refresh();
    return successState(`${generatedFixtures.length} placement game${generatedFixtures.length === 1 ? "" : "s"} generated.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function addScheduleBlock(_state: ActionState, formData: FormData) {
  try {
    const tournamentId = requireText(formData, "tournamentId");
    const label = requireText(formData, "blockLabel");
    const startsAt = parseDatetimeLocal(requireText(formData, "blockStartsAt"));
    const durationMinutes = requireInteger(formData, "blockDurationMinutes", 1);
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + durationMinutes);

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { slug: true },
    });

    await prisma.scheduleBlock.create({
      data: {
        tournamentId,
        label,
        startsAt,
        endsAt,
      },
    });

    revalidateSchedulePages(tournament.slug);
    refresh();
    return successState(`${label} was added to the schedule.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteScheduleBlock(_state: ActionState, formData: FormData) {
  try {
    const blockId = requireText(formData, "blockId");

    const block = await prisma.scheduleBlock.findUniqueOrThrow({
      where: { id: blockId },
      select: {
        label: true,
        tournament: {
          select: { slug: true },
        },
      },
    });

    await prisma.scheduleBlock.delete({
      where: { id: blockId },
    });

    revalidateSchedulePages(block.tournament.slug);
    refresh();
    return successState(`${block.label} was removed from the schedule.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function generatePlannedPlayoffs(_state: ActionState, formData: FormData) {
  try {
    const tournamentId = requireText(formData, "tournamentId");
    const firstPitch = parseDatetimeLocal(requireText(formData, "plannedPlayoffFirstPitch"));
    const includeFifthPlaceGame = formData.get("includePlannedFifthPlaceGame") === "on";
    const replaceExisting = formData.get("replaceExistingPlannedPlayoffs") === "on";

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: {
        bracketMatches: {
          where: {
            stage: {
              in: ["final", "third-place", "fifth-place"],
            },
          },
          select: { homeRuns: true, awayRuns: true },
        },
        pitches: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (tournament.pitches.length < 2) {
      throw new Error("Add at least two pitches before planning playoff slots.");
    }

    if (tournament.bracketMatches.length > 0 && !replaceExisting) {
      throw new Error("Planned playoff slots already exist. Tick replace existing planned playoffs to regenerate them.");
    }

    const hasScores = tournament.bracketMatches.some(
      (match) => match.homeRuns !== null || match.awayRuns !== null,
    );

    if (hasScores && !replaceExisting) {
      throw new Error("These planned playoff slots have scores. Tick replace existing if you really want to clear them.");
    }

    const games = [
      { awaySeed: "2nd", homeSeed: "1st", label: "Final", pitchIndex: 0, sortOrder: 1, stage: "final" },
      { awaySeed: "4th", homeSeed: "3rd", label: "3rd place game", pitchIndex: 1, sortOrder: 2, stage: "third-place" },
    ];

    if (includeFifthPlaceGame) {
      games.push({
        awaySeed: "6th",
        homeSeed: "5th",
        label: "5th place game",
        pitchIndex: Math.min(2, tournament.pitches.length - 1),
        sortOrder: 3,
        stage: "fifth-place",
      });
    }

    await prisma.$transaction([
      prisma.bracketMatch.deleteMany({
        where: {
          tournamentId,
          stage: {
            in: ["final", "third-place", "fifth-place"],
          },
        },
      }),
      prisma.bracketMatch.createMany({
        data: games.map((game) => ({
          tournamentId,
          label: game.label,
          stage: game.stage,
          startsAt: firstPitch,
          pitchId: tournament.pitches[game.pitchIndex]?.id,
          homeSeed: game.homeSeed,
          awaySeed: game.awaySeed,
          sortOrder: game.sortOrder,
        })),
      }),
    ]);

    revalidateSchedulePages(tournament.slug);
    refresh();
    return successState(`${games.length} planned playoff slot${games.length === 1 ? "" : "s"} generated.`);
  } catch (error) {
    return errorState(error);
  }
}

function requireText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function requireInteger(formData: FormData, key: string, min: number) {
  const value = Number(requireText(formData, key));

  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${key} must be a whole number of at least ${min}.`);
  }

  return value;
}

function parseDatetimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("First pitch must be a valid date and time.");
  }

  return date;
}

function revalidateSchedulePages(slug: string) {
  const adminBase = `/admin/tournaments/${slug}`;

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/results");
  revalidatePath("/admin/standings");
  revalidatePath(adminBase);
  revalidatePath(`${adminBase}/schedule`);
  revalidatePath(`${adminBase}/results`);
  revalidatePath(`${adminBase}/standings`);
  revalidatePath(`/tournaments/${slug}`);
}

function isPlacementStage(stage: string) {
  return stage === "final" || stage === "third-place" || stage === "fifth-place";
}

function mapTournamentView(record: {
  id: string;
  slug: string;
  name: string;
  startsOn: Date;
  endsOn: Date | null;
  venue: string;
  city: string;
  format: string;
  status: string;
  tournamentType: string;
  seasonYear: number;
  mvpMode: string;
  gameMinutes: number;
  slotGapMinutes: number;
  checkInAt: Date | null;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  announcements: string[];
  pitches: Array<{ name: string }>;
}): Tournament {
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
    pitches: record.pitches.map((pitch) => pitch.name),
    gameMinutes: record.gameMinutes,
    slotGapMinutes: record.slotGapMinutes,
    checkInTime: record.checkInAt?.toISOString() ?? record.startsOn.toISOString(),
    points: {
      win: record.winPoints,
      draw: record.drawPoints,
      loss: record.lossPoints,
    },
    announcements: record.announcements,
  };
}

function mapTeamView(record: {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string;
  colour: string;
  contactName: string | null;
  contactEmail: string | null;
}): Team {
  return {
    id: record.id,
    tournamentId: record.tournamentId,
    name: record.name,
    shortName: record.shortName,
    colour: record.colour,
    contactName: record.contactName ?? undefined,
    contactEmail: record.contactEmail ?? undefined,
  };
}

function mapFixtureView(record: {
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
  };
}
