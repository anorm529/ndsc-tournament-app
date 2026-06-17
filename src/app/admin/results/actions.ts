"use server";

import { refresh, revalidatePath, revalidateTag } from "next/cache";

import { prisma } from "@/lib/db";
import { ActionState, errorState, successState } from "@/lib/action-state";
import { requirePermission } from "@/lib/current-admin";
import { getAuditActorData, writeAuditLog } from "@/lib/audit";
import { calculateStandings } from "@/lib/tournaments/standings";
import { Fixture, MvpCategory, Team, Tournament } from "@/lib/tournaments/types";

const placementStages = ["final", "third-place", "fifth-place"] as const;

export async function updateFixtureScores(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("scores");

    const tournamentId = readString(formData, "tournamentId");
    const fixtureIds = formData.getAll("fixtureId").map((value) => String(value));

    if (!tournamentId || fixtureIds.length === 0) {
      throw new Error("No tournament or fixtures were submitted.");
    }

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { id: true, mvpMode: true, slug: true },
    });

    const uniqueFixtureIds = [...new Set(fixtureIds)];
    const validFixtures = await prisma.fixture.findMany({
      where: {
        id: { in: uniqueFixtureIds },
        tournamentId: tournament.id,
      },
      select: { awayRuns: true, awayTeamId: true, homeRuns: true, homeTeamId: true, id: true },
    });
    const validFixturesById = new Map(validFixtures.map((fixture) => [fixture.id, fixture]));

    if (validFixturesById.size !== uniqueFixtureIds.length) {
      throw new Error("One or more submitted fixtures do not belong to this tournament.");
    }

    const activeFixtureIds = uniqueFixtureIds.filter((fixtureId) => {
      const fixture = validFixturesById.get(fixtureId);

      if (!fixture) {
        return false;
      }

      return hasScoreValue(formData, `homeRuns-${fixtureId}`) ||
        hasScoreValue(formData, `awayRuns-${fixtureId}`) ||
        fixture.homeRuns !== null ||
        fixture.awayRuns !== null ||
        hasSubmittedMvpValue(formData, fixtureId);
    });

    if (activeFixtureIds.length === 0) {
      return successState("No scores or MVP votes were entered.");
    }

    const updates = activeFixtureIds.flatMap((fixtureId) => {
      const fixture = validFixturesById.get(fixtureId);

      if (!fixture) {
        throw new Error("One or more submitted fixtures do not belong to this tournament.");
      }

      const scoreUpdate = prisma.fixture.update({
        where: { id: fixtureId },
        data: {
          homeRuns: readOptionalScore(formData, `homeRuns-${fixtureId}`),
          awayRuns: readOptionalScore(formData, `awayRuns-${fixtureId}`),
        },
      });

      if (tournament.mvpMode === "gendered") {
        return [
          scoreUpdate,
          writeMvpVote({
            category: "male",
            fixtureId,
            key: `homeMvp-${fixtureId}-male`,
            formData,
            teamId: fixture.homeTeamId,
            tournamentId: tournament.id,
          }),
          writeMvpVote({
            category: "female",
            fixtureId,
            key: `homeMvp-${fixtureId}-female`,
            formData,
            teamId: fixture.homeTeamId,
            tournamentId: tournament.id,
          }),
          writeMvpVote({
            category: "male",
            fixtureId,
            key: `awayMvp-${fixtureId}-male`,
            formData,
            teamId: fixture.awayTeamId,
            tournamentId: tournament.id,
          }),
          writeMvpVote({
            category: "female",
            fixtureId,
            key: `awayMvp-${fixtureId}-female`,
            formData,
            teamId: fixture.awayTeamId,
            tournamentId: tournament.id,
          }),
        ];
      }

      return [
        scoreUpdate,
        prisma.mvpVote.deleteMany({
          where: {
            category: {
              in: ["male", "female"],
            },
            fixtureId,
          },
        }),
        writeMvpVote({
          category: "overall",
          fixtureId,
          key: `homeMvp-${fixtureId}-overall`,
          formData,
          teamId: fixture.homeTeamId,
          tournamentId: tournament.id,
        }),
        writeMvpVote({
          category: "overall",
          fixtureId,
          key: `awayMvp-${fixtureId}-overall`,
          formData,
          teamId: fixture.awayTeamId,
          tournamentId: tournament.id,
        }),
      ];
    });

    await prisma.$transaction(updates, {
      maxWait: 10_000,
      timeout: 15_000,
    });

    const [plannedFixturesCreated, actorData, tournamentTeams] = await Promise.all([
      materializePlannedPlayoffs(tournament.id),
      getAuditActorData(),
      prisma.team.findMany({ where: { tournamentId: tournament.id }, select: { id: true, name: true } }),
    ]);
    const teamNamesById = new Map(tournamentTeams.map((t) => [t.id, t.name]));

    const scoreAuditEntries: { tournamentId: string; entityType: string; entityId: string; action: string; actorEmail: string | null; actorName: string | null; actorRole: string | null; summary: string }[] = [];
    for (const fixtureId of activeFixtureIds) {
      const before = validFixturesById.get(fixtureId);
      if (!before) continue;
      const newHomeRuns = readOptionalScore(formData, `homeRuns-${fixtureId}`);
      const newAwayRuns = readOptionalScore(formData, `awayRuns-${fixtureId}`);
      if (newHomeRuns === before.homeRuns && newAwayRuns === before.awayRuns) continue;
      const homeName = teamNamesById.get(before.homeTeamId) ?? "Home";
      const awayName = teamNamesById.get(before.awayTeamId) ?? "Away";
      const hadScore = before.homeRuns !== null || before.awayRuns !== null;
      let summary: string;
      if (newHomeRuns === null && newAwayRuns === null) {
        summary = `Score cleared: ${homeName} vs ${awayName} (was ${before.homeRuns ?? "?"}–${before.awayRuns ?? "?"})`;
      } else if (hadScore) {
        summary = `Score corrected: ${homeName} ${newHomeRuns ?? "?"}–${newAwayRuns ?? "?"} ${awayName} (was ${before.homeRuns ?? "?"}–${before.awayRuns ?? "?"})`;
      } else {
        summary = `Score set: ${homeName} ${newHomeRuns ?? "?"}–${newAwayRuns ?? "?"} ${awayName}`;
      }
      scoreAuditEntries.push({ tournamentId: tournament.id, entityType: "fixture", entityId: fixtureId, action: "score_update", ...actorData, summary });
    }

    if (scoreAuditEntries.length > 0) {
      await prisma.auditLog.createMany({ data: scoreAuditEntries });
    } else {
      await prisma.auditLog.create({
        data: {
          tournamentId: tournament.id,
          entityType: "fixture",
          action: "mvp_update",
          ...actorData,
          summary: `${activeFixtureIds.length} MVP vote set${activeFixtureIds.length === 1 ? "" : "s"} saved.`,
        },
      });
    }

    const adminBase = `/admin/tournaments/${tournament.slug}`;

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/results");
    revalidatePath("/admin/standings");
    revalidatePath(adminBase);
    revalidatePath(`${adminBase}/results`);
    revalidatePath(`${adminBase}/schedule`);
    revalidatePath(`${adminBase}/standings`);
    revalidatePath(`/tournaments/${tournament.slug}`);
    refresh();
    return successState(
      plannedFixturesCreated > 0
        ? `Scores were saved and ${plannedFixturesCreated} planned playoff slot${plannedFixturesCreated === 1 ? "" : "s"} were filled.`
        : "Scores were saved.",
    );
  } catch (error) {
    return errorState(error);
  }
}

export async function fillPlannedPlayoffSlots(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("scores");

    const tournamentId = readString(formData, "tournamentId");

    if (!tournamentId) {
      throw new Error("No tournament was selected.");
    }

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { slug: true },
    });
    const adminBase = `/admin/tournaments/${tournament.slug}`;
    const plannedFixturesCreated = await materializePlannedPlayoffs(tournamentId);

    revalidateResultPages(tournament.slug);
    revalidatePath(`${adminBase}/schedule`);
    refresh();

    if (plannedFixturesCreated === 0) {
      return errorState(
        "No playoff slots were filled. Check that planned playoff slots exist and all round-robin scores are entered.",
      );
    }

    return successState(
      `${plannedFixturesCreated} playoff game${plannedFixturesCreated === 1 ? "" : "s"} filled from the round-robin table.`,
    );
  } catch (error) {
    return errorState(error);
  }
}

/*
 * Keep this intentionally narrow: the results page submits every fixture on the
 * page, but tournament day saves usually touch only the latest one or two games.
 */
function hasSubmittedMvpValue(formData: FormData, fixtureId: string) {
  return [
    `homeMvp-${fixtureId}-overall`,
    `awayMvp-${fixtureId}-overall`,
    `homeMvp-${fixtureId}-male`,
    `homeMvp-${fixtureId}-female`,
    `awayMvp-${fixtureId}-male`,
    `awayMvp-${fixtureId}-female`,
  ].some((key) => readString(formData, key).trim() !== "");
}

function hasScoreValue(formData: FormData, key: string) {
  return readString(formData, key).trim() !== "";
}

export async function deleteMvpVote(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("scores");

    const voteId = readString(formData, "voteId");

    if (!voteId) {
      throw new Error("No MVP vote was selected.");
    }

    const vote = await prisma.mvpVote.findUniqueOrThrow({
      where: { id: voteId },
      select: {
        playerName: true,
        tournamentId: true,
        tournament: {
          select: { slug: true },
        },
      },
    });

    await prisma.mvpVote.delete({
      where: { id: voteId },
    });
    await writeAuditLog({
      tournamentId: vote.tournamentId,
      entityType: "mvp_vote",
      entityId: voteId,
      action: "delete",
      summary: `${vote.playerName}'s MVP vote was deleted.`,
    });

    revalidateResultPages(vote.tournament.slug);
    refresh();
    return successState(`${vote.playerName}'s MVP vote was deleted.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteTournamentMvpVotes(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("scores");

    const tournamentId = readString(formData, "tournamentId");

    if (!tournamentId) {
      throw new Error("No tournament was selected.");
    }

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { id: true, name: true, slug: true },
    });

    const deleted = await prisma.mvpVote.deleteMany({
      where: { tournamentId },
    });
    await writeAuditLog({
      tournamentId: tournament.id,
      entityType: "mvp_vote",
      action: "delete_all",
      summary: `${deleted.count} MVP vote${deleted.count === 1 ? "" : "s"} deleted.`,
    });

    revalidateResultPages(tournament.slug);
    refresh();
    return successState(`${deleted.count} MVP vote${deleted.count === 1 ? "" : "s"} deleted from ${tournament.name}.`);
  } catch (error) {
    return errorState(error);
  }
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateResultPages(slug: string) {
  const adminBase = `/admin/tournaments/${slug}`;

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/results");
  revalidatePath("/admin/standings");
  revalidatePath(adminBase);
  revalidatePath(`${adminBase}/results`);
  revalidatePath(`${adminBase}/schedule`);
  revalidatePath(`${adminBase}/standings`);
  revalidatePath(`/tournaments/${slug}`);
  revalidateTag("tournament-bundle", "max");
  revalidateTag("tournament-cards", "max");
}

async function materializePlannedPlayoffs(tournamentId: string) {
  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: tournamentId },
    include: {
      bracketMatches: {
        where: {
          stage: {
            in: [...placementStages],
          },
        },
        include: { pitch: true },
        orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
      },
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

  if (tournament.bracketMatches.length === 0) {
    return 0;
  }

  const groupFixtures = tournament.fixtures.filter((fixture) => fixture.stage === "group");
  const existingPlacementFixtures = tournament.fixtures.filter((fixture) =>
    placementStages.some((stage) => stage === fixture.stage),
  );

  if (
    groupFixtures.length === 0 ||
    groupFixtures.some((fixture) => fixture.homeRuns === null || fixture.awayRuns === null) ||
    existingPlacementFixtures.some((fixture) => fixture.homeRuns !== null || fixture.awayRuns !== null)
  ) {
    return 0;
  }

  const tournamentView = mapTournamentView(tournament);
  const teams = tournament.teams.map(mapTeamView);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const rankedTeams = calculateStandings(
    tournamentView,
    teams,
    groupFixtures.map(mapFixtureView),
  )
    .map((standing) => teamsById.get(standing.teamId))
    .filter((team): team is Team => Boolean(team));

  const plannedFixtures = tournament.bracketMatches.flatMap((match) => {
    const pair = getPlacementPair(match.stage, rankedTeams);

    if (!pair) {
      return [];
    }

    return [{
      awayTeamId: pair.awayTeam.id,
      homeTeamId: pair.homeTeam.id,
      matchId: match.id,
      pitchId: match.pitchId,
      round: 99,
      stage: match.stage,
      startsAt: match.startsAt,
      tournamentId: tournament.id,
    }];
  });

  if (plannedFixtures.length === 0) {
    return 0;
  }

  await prisma.$transaction(
    [
      prisma.fixture.deleteMany({
        where: {
          tournamentId: tournament.id,
          stage: {
            in: [...placementStages],
          },
        },
      }),
      prisma.fixture.createMany({
        data: plannedFixtures.map((fixture) => ({
          awayTeamId: fixture.awayTeamId,
          homeTeamId: fixture.homeTeamId,
          pitchId: fixture.pitchId,
          round: fixture.round,
          stage: fixture.stage,
          startsAt: fixture.startsAt,
          tournamentId: fixture.tournamentId,
        })),
      }),
      ...plannedFixtures.map((fixture) =>
        prisma.bracketMatch.update({
          where: { id: fixture.matchId },
          data: {
            awayTeamId: fixture.awayTeamId,
            homeTeamId: fixture.homeTeamId,
          },
        }),
      ),
    ],
    {
      maxWait: 10_000,
      timeout: 15_000,
    },
  );

  return plannedFixtures.length;
}

function getPlacementPair(stage: string, rankedTeams: Team[]) {
  if (stage === "final" && rankedTeams[0] && rankedTeams[1]) {
    return { homeTeam: rankedTeams[0], awayTeam: rankedTeams[1] };
  }

  if (stage === "third-place" && rankedTeams[2] && rankedTeams[3]) {
    return { homeTeam: rankedTeams[2], awayTeam: rankedTeams[3] };
  }

  if (stage === "fifth-place" && rankedTeams[4] && rankedTeams[5]) {
    return { homeTeam: rankedTeams[4], awayTeam: rankedTeams[5] };
  }

  return null;
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

function readOptionalScore(formData: FormData, key: string) {
  const value = readString(formData, key).trim();

  if (value === "") {
    return null;
  }

  const score = Number(value);

  if (!Number.isInteger(score) || score < 0) {
    throw new Error("Scores must be whole numbers zero or above.");
  }

  return score;
}

function readOptionalName(formData: FormData, key: string) {
  const value = readString(formData, key).trim().replace(/\s+/g, " ");

  if (value.length > 80) {
    throw new Error("MVP names must be 80 characters or fewer.");
  }

  return value;
}

function writeMvpVote({
  category,
  fixtureId,
  formData,
  key,
  shouldDelete,
  teamId,
  tournamentId,
}: {
  category: MvpCategory;
  fixtureId: string;
  formData: FormData;
  key: string;
  shouldDelete?: boolean;
  teamId: string;
  tournamentId: string;
}) {
  const playerName = readOptionalName(formData, key);

  if (!playerName || shouldDelete) {
    return prisma.mvpVote.deleteMany({
      where: {
        category,
        fixtureId,
        teamId,
      },
    });
  }

  return prisma.mvpVote.upsert({
    where: {
      fixtureId_teamId_category: {
        category,
        fixtureId,
        teamId,
      },
    },
    create: {
      category,
      fixtureId,
      playerName,
      teamId,
      tournamentId,
    },
    update: {
      playerName,
    },
  });
}
