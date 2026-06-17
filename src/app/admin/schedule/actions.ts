"use server";

import { refresh, revalidatePath, revalidateTag } from "next/cache";

import { prisma } from "@/lib/db";
import { ActionState, errorState, successState } from "@/lib/action-state";
import { requirePermission } from "@/lib/current-admin";
import { getAuditActorData, writeAuditLog } from "@/lib/audit";
import { generatePlacementPlayoffs, generateRoundRobinSchedule } from "@/lib/tournaments/scheduler";
import { calculateStandings } from "@/lib/tournaments/standings";
import { Fixture, Team, Tournament } from "@/lib/tournaments/types";

export async function generateSchedule(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

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
        umpires: {
          where: { defaultPitchId: { not: null } },
          select: { id: true, defaultPitchId: true },
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
        schedulePublished: tournament.schedulePublished,
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

    const actorData = await getAuditActorData();

    await prisma.$transaction(async (tx) => {
      await tx.tournament.update({
        where: { id: tournament.id },
        data: { schedulePublished: false },
      });
      await tx.fixture.deleteMany({
        where: {
          tournamentId: tournament.id,
          stage: {
            in: ["group", "final", "third-place", "fifth-place"],
          },
        },
      });
      await tx.fixture.createMany({
        data: generatedFixtures.map((fixture) => ({
          tournamentId: tournament.id,
          round: fixture.round,
          startsAt: new Date(fixture.startsAt),
          pitchId: pitchIdsByName.get(fixture.pitch),
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          stage: "group",
        })),
      });

      const createdFixtures = await tx.fixture.findMany({
        where: { tournamentId: tournament.id, stage: "group" },
        select: { id: true, pitchId: true },
      });
      const fixtureUmpires = createdFixtures.flatMap((fixture) =>
        tournament.umpires
          .filter((umpire) => umpire.defaultPitchId === fixture.pitchId)
          .map((umpire) => ({
            fixtureId: fixture.id,
            umpireId: umpire.id,
            role: "diamond",
          })),
      );

      if (fixtureUmpires.length > 0) {
        await tx.fixtureUmpire.createMany({
          data: fixtureUmpires,
          skipDuplicates: true,
        });
      }

      await tx.auditLog.create({
        data: {
          tournamentId: tournament.id,
          entityType: "fixture",
          action: "generate_schedule",
          ...actorData,
          summary: `${generatedFixtures.length} group fixture${generatedFixtures.length === 1 ? "" : "s"} generated.`,
        },
      });
    });

    revalidateSchedulePages(tournament.slug);
    refresh();
    return successState(`${generatedFixtures.length} fixtures were generated.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function generatePlacementSchedule(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

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

    if (tournament.teams.length < 3) {
      throw new Error("Add at least three teams before generating placement playoffs.");
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
      prisma.tournament.update({
        where: { id: tournament.id },
        data: { schedulePublished: false },
      }),
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
    await requirePermission("schedule");

    const tournamentId = requireText(formData, "tournamentId");
    const label = requireText(formData, "blockLabel");
    const startsAt = parseDatetimeLocal(requireText(formData, "blockStartsAt"));
    const durationMinutes = requireInteger(formData, "blockDurationMinutes", 1);
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + durationMinutes);

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: {
        bracketMatches: {
          select: { id: true, startsAt: true },
        },
        fixtures: {
          select: { id: true, startsAt: true },
        },
        scheduleBlocks: {
          select: { endsAt: true, id: true, startsAt: true },
        },
      },
    });

    assertBreakStartsBetweenGames({
      bracketMatches: tournament.bracketMatches,
      fixtures: tournament.fixtures,
      gameMinutes: tournament.gameMinutes,
      startsAt,
    });

    assertBreakDoesNotOverlapExistingBlocks({
      blocks: tournament.scheduleBlocks,
      endsAt,
      startsAt,
    });

    const shift = getBreakShift({
      bracketMatches: tournament.bracketMatches,
      endsAt,
      fixtures: tournament.fixtures,
      startsAt,
    });
    const fixturesToShift = shift
      ? tournament.fixtures.filter((fixture) => fixture.startsAt >= shift.from)
      : [];
    const bracketMatchesToShift = shift
      ? tournament.bracketMatches.filter((match) => match.startsAt >= shift.from)
      : [];
    const scheduleBlocksToShift = shift
      ? tournament.scheduleBlocks.filter((block) => block.startsAt >= shift.from)
      : [];

    await prisma.$transaction([
      ...fixturesToShift.map((fixture) =>
        prisma.fixture.update({
          where: { id: fixture.id },
          data: { startsAt: addMilliseconds(fixture.startsAt, shift?.milliseconds ?? 0) },
        }),
      ),
      ...bracketMatchesToShift.map((match) =>
        prisma.bracketMatch.update({
          where: { id: match.id },
          data: { startsAt: addMilliseconds(match.startsAt, shift?.milliseconds ?? 0) },
        }),
      ),
      ...scheduleBlocksToShift.map((block) =>
        prisma.scheduleBlock.update({
          where: { id: block.id },
          data: {
            endsAt: addMilliseconds(block.endsAt, shift?.milliseconds ?? 0),
            startsAt: addMilliseconds(block.startsAt, shift?.milliseconds ?? 0),
          },
        }),
      ),
      prisma.scheduleBlock.create({
        data: {
          tournamentId,
          label,
          startsAt,
          endsAt,
        },
      }),
    ]);

    revalidateSchedulePages(tournament.slug);
    refresh();
    const shiftedItemsCount = fixturesToShift.length + bracketMatchesToShift.length + scheduleBlocksToShift.length;

    return successState(
      shiftedItemsCount > 0
        ? `${label} was added and ${shiftedItemsCount} later schedule item${shiftedItemsCount === 1 ? "" : "s"} moved back.`
        : `${label} was added to the schedule.`,
    );
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteScheduleBlock(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

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
    await requirePermission("schedule");

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
        teams: {
          orderBy: { name: "asc" },
        },
      },
    });

    if (tournament.teams.length < 3) {
      throw new Error("Add at least three teams before planning playoff slots.");
    }

    if (tournament.pitches.length < 1) {
      throw new Error("Add at least one pitch before planning playoff slots.");
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
    ];

    if (tournament.teams.length >= 4) {
      games.push({
        awaySeed: "4th",
        homeSeed: "3rd",
        label: "3rd place game",
        pitchIndex: Math.min(1, tournament.pitches.length - 1),
        sortOrder: 2,
        stage: "third-place",
      });
    }

    if (includeFifthPlaceGame) {
      if (tournament.teams.length < 6) {
        throw new Error("Add at least six teams before planning a 5th v 6th slot.");
      }

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
      prisma.tournament.update({
        where: { id: tournament.id },
        data: { schedulePublished: false },
      }),
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

export async function publishSchedule(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

    const tournamentId = requireText(formData, "tournamentId");

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: {
        _count: {
          select: {
            bracketMatches: true,
            fixtures: true,
            scheduleBlocks: true,
          },
        },
      },
    });

    const itemCount = tournament._count.fixtures + tournament._count.bracketMatches + tournament._count.scheduleBlocks;

    if (itemCount === 0) {
      throw new Error("Create a schedule before publishing it.");
    }

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: { schedulePublished: true },
    });
    await writeAuditLog({
      tournamentId: tournament.id,
      entityType: "schedule",
      action: "publish",
      summary: "Schedule was published to the public page.",
    });

    revalidateSchedulePages(tournament.slug);
    refresh();
    return successState("Schedule published to the public page.");
  } catch (error) {
    return errorState(error);
  }
}

export async function unpublishSchedule(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

    const tournamentId = requireText(formData, "tournamentId");
    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { id: true, slug: true },
    });

    await prisma.tournament.update({
      where: { id: tournament.id },
      data: { schedulePublished: false },
    });
    await writeAuditLog({
      tournamentId: tournament.id,
      entityType: "schedule",
      action: "unpublish",
      summary: "Schedule was moved back to draft.",
    });

    revalidateSchedulePages(tournament.slug);
    refresh();
    return successState("Schedule moved back to draft.");
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteSchedule(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

    const tournamentId = requireText(formData, "tournamentId");
    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { id: true, name: true, slug: true },
    });

    const actorData = await getAuditActorData();

    await prisma.$transaction([
      prisma.tournament.update({
        where: { id: tournament.id },
        data: { schedulePublished: false },
      }),
      prisma.mvpVote.deleteMany({
        where: { tournamentId: tournament.id },
      }),
      prisma.fixture.deleteMany({
        where: { tournamentId: tournament.id },
      }),
      prisma.bracketMatch.deleteMany({
        where: { tournamentId: tournament.id },
      }),
      prisma.scheduleBlock.deleteMany({
        where: { tournamentId: tournament.id },
      }),
      prisma.auditLog.create({
        data: {
          tournamentId: tournament.id,
          entityType: "schedule",
          action: "delete",
          ...actorData,
          summary: "Schedule, matches, planned playoffs, breaks, scores, and MVP votes were deleted.",
        },
      }),
    ]);

    revalidateSchedulePages(tournament.slug);
    refresh();
    return successState(`Schedule, matches, planned playoffs, breaks, and MVP votes were deleted for ${tournament.name}.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function updateFixtureSchedule(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

    const fixtureId = requireText(formData, "fixtureId");
    const startsAt = parseDatetimeLocal(requireText(formData, "fixtureStartsAt"));
    const homeTeamId = requireText(formData, "homeTeamId");
    const awayTeamId = requireText(formData, "awayTeamId");
    const pitchName = requireText(formData, "pitchName");

    if (homeTeamId === awayTeamId) {
      throw new Error("A match needs two different teams.");
    }

    const fixture = await prisma.fixture.findUniqueOrThrow({
      where: { id: fixtureId },
      select: {
        awayTeamId: true,
        awayRuns: true,
        homeRuns: true,
        homeTeamId: true,
        id: true,
        tournamentId: true,
        tournament: {
          select: { slug: true },
        },
      },
    });

    const pitch = await findTournamentPitch(pitchName, fixture.tournamentId);
    await assertTeamBelongsToTournament(homeTeamId, fixture.tournamentId);
    await assertTeamBelongsToTournament(awayTeamId, fixture.tournamentId);
    const teamsChanged = fixture.homeTeamId !== homeTeamId || fixture.awayTeamId !== awayTeamId;

    if (teamsChanged && (fixture.homeRuns !== null || fixture.awayRuns !== null)) {
      throw new Error("Clear this match score before changing its teams.");
    }

    const oldSummary = `${fixture.homeTeamId}/${fixture.awayTeamId}`;

    const actorData = await getAuditActorData();

    await prisma.$transaction([
      prisma.tournament.update({
        where: { id: fixture.tournamentId },
        data: { schedulePublished: false },
      }),
      ...(teamsChanged
        ? [
            prisma.mvpVote.deleteMany({
              where: { fixtureId: fixture.id },
            }),
          ]
        : []),
      prisma.fixture.update({
        where: { id: fixture.id },
        data: {
          awayTeamId,
          homeTeamId,
          pitchId: pitch.id,
          startsAt,
        },
      }),
      prisma.auditLog.create({
        data: {
          tournamentId: fixture.tournamentId,
          entityType: "fixture",
          entityId: fixture.id,
          action: teamsChanged ? "change_teams" : "move",
          ...actorData,
          summary: teamsChanged
            ? `Fixture teams changed from ${oldSummary}. Score and MVP votes were cleared if present.`
            : "Fixture time or pitch was changed.",
        },
      }),
    ]);

    revalidateSchedulePages(fixture.tournament.slug);
    refresh();
    return successState(teamsChanged ? "Match teams and slot updated. Schedule moved back to draft." : "Match slot updated. Schedule moved back to draft.");
  } catch (error) {
    return errorState(error);
  }
}

export async function updatePlannedPlayoffSlot(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

    const matchId = requireText(formData, "matchId");
    const startsAt = parseDatetimeLocal(requireText(formData, "matchStartsAt"));
    const pitchName = requireText(formData, "pitchName");

    const match = await prisma.bracketMatch.findUniqueOrThrow({
      where: { id: matchId },
      select: {
        id: true,
        tournamentId: true,
        tournament: {
          select: { slug: true },
        },
      },
    });

    const pitch = await findTournamentPitch(pitchName, match.tournamentId);

    const actorData = await getAuditActorData();

    await prisma.$transaction([
      prisma.tournament.update({
        where: { id: match.tournamentId },
        data: { schedulePublished: false },
      }),
      prisma.bracketMatch.update({
        where: { id: match.id },
        data: {
          pitchId: pitch.id,
          startsAt,
        },
      }),
      prisma.auditLog.create({
        data: {
          tournamentId: match.tournamentId,
          entityType: "bracket_match",
          entityId: match.id,
          action: "move",
          ...actorData,
          summary: "Planned playoff slot time or pitch was changed.",
        },
      }),
    ]);

    revalidateSchedulePages(match.tournament.slug);
    refresh();
    return successState("Playoff slot updated.");
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

async function findTournamentPitch(pitchName: string, tournamentId: string) {
  const pitch = await prisma.pitch.findFirst({
    where: {
      name: pitchName,
      tournamentId,
    },
    select: { id: true },
  });

  if (!pitch) {
    throw new Error("Selected pitch does not belong to this tournament.");
  }

  return pitch;
}

async function assertTeamBelongsToTournament(teamId: string, tournamentId: string) {
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      tournamentId,
    },
    select: { id: true },
  });

  if (!team) {
    throw new Error("Selected team does not belong to this tournament.");
  }
}

function requireInteger(formData: FormData, key: string, min: number) {
  const value = Number(requireText(formData, key));

  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${key} must be a whole number of at least ${min}.`);
  }

  return value;
}

function parseDatetimeLocal(value: string) {
  const normalizedValue = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalizedValue}Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("First pitch must be a valid date and time.");
  }

  return date;
}

function addMinutes(date: Date, minutes: number) {
  const updated = new Date(date);
  updated.setMinutes(updated.getMinutes() + minutes);
  return updated;
}

function addMilliseconds(date: Date, milliseconds: number) {
  return new Date(date.getTime() + milliseconds);
}

function getBreakShift({
  bracketMatches,
  endsAt,
  fixtures,
  startsAt,
}: {
  bracketMatches: Array<{ startsAt: Date }>;
  endsAt: Date;
  fixtures: Array<{ startsAt: Date }>;
  startsAt: Date;
}) {
  const firstPlayableStart = [...fixtures, ...bracketMatches]
    .filter((item) => item.startsAt >= startsAt)
    .reduce<Date | null>((earliest, item) => {
      if (!earliest || item.startsAt < earliest) {
        return item.startsAt;
      }

      return earliest;
    }, null);

  if (!firstPlayableStart || firstPlayableStart >= endsAt) {
    return null;
  }

  return {
    from: firstPlayableStart,
    milliseconds: endsAt.getTime() - firstPlayableStart.getTime(),
  };
}

function assertBreakStartsBetweenGames({
  bracketMatches,
  fixtures,
  gameMinutes,
  startsAt,
}: {
  bracketMatches: Array<{ startsAt: Date }>;
  fixtures: Array<{ startsAt: Date }>;
  gameMinutes: number;
  startsAt: Date;
}) {
  const overlappingItem = [...fixtures, ...bracketMatches].find((item) => {
    const itemEndsAt = addMinutes(item.startsAt, gameMinutes);
    return item.startsAt < startsAt && itemEndsAt > startsAt;
  });

  if (overlappingItem) {
    throw new Error("Breaks must start between game slots, not during a game.");
  }
}

function assertBreakDoesNotOverlapExistingBlocks({
  blocks,
  endsAt,
  startsAt,
}: {
  blocks: Array<{ endsAt: Date; startsAt: Date }>;
  endsAt: Date;
  startsAt: Date;
}) {
  const overlappingBlock = blocks.find((block) => startsAt < block.endsAt && endsAt > block.startsAt);

  if (overlappingBlock) {
    throw new Error("This break overlaps an existing break. Remove or move the existing break first.");
  }
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
  revalidateTag("tournament-bundle", "max");
  revalidateTag("tournament-cards", "max");
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
  schedulePublished: boolean;
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
