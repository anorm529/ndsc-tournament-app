"use server";

import { refresh, revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { ActionState, errorState, successState } from "@/lib/action-state";
import { MvpCategory } from "@/lib/tournaments/types";

export async function updateFixtureScores(_state: ActionState, formData: FormData) {
  try {
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
      select: { awayTeamId: true, homeTeamId: true, id: true },
    });
    const validFixturesById = new Map(validFixtures.map((fixture) => [fixture.id, fixture]));

    if (validFixturesById.size !== uniqueFixtureIds.length) {
      throw new Error("One or more submitted fixtures do not belong to this tournament.");
    }

    const updates = uniqueFixtureIds.flatMap((fixtureId) => {
      const fixture = validFixturesById.get(fixtureId);

      if (!fixture) {
        throw new Error("One or more submitted fixtures do not belong to this tournament.");
      }

      return [
        prisma.fixture.update({
          where: { id: fixtureId },
          data: {
            homeRuns: readOptionalScore(formData, `homeRuns-${fixtureId}`),
            awayRuns: readOptionalScore(formData, `awayRuns-${fixtureId}`),
          },
        }),
        writeMvpVote({
          category: "overall",
          fixtureId,
          key: `homeMvp-${fixtureId}-overall`,
          formData,
          shouldDelete: tournament.mvpMode !== "overall",
          teamId: fixture.homeTeamId,
          tournamentId: tournament.id,
        }),
        writeMvpVote({
          category: "overall",
          fixtureId,
          key: `awayMvp-${fixtureId}-overall`,
          formData,
          shouldDelete: tournament.mvpMode !== "overall",
          teamId: fixture.awayTeamId,
          tournamentId: tournament.id,
        }),
        writeMvpVote({
          category: "male",
          fixtureId,
          key: `homeMvp-${fixtureId}-male`,
          formData,
          shouldDelete: tournament.mvpMode !== "gendered",
          teamId: fixture.homeTeamId,
          tournamentId: tournament.id,
        }),
        writeMvpVote({
          category: "female",
          fixtureId,
          key: `homeMvp-${fixtureId}-female`,
          formData,
          shouldDelete: tournament.mvpMode !== "gendered",
          teamId: fixture.homeTeamId,
          tournamentId: tournament.id,
        }),
        writeMvpVote({
          category: "male",
          fixtureId,
          key: `awayMvp-${fixtureId}-male`,
          formData,
          shouldDelete: tournament.mvpMode !== "gendered",
          teamId: fixture.awayTeamId,
          tournamentId: tournament.id,
        }),
        writeMvpVote({
          category: "female",
          fixtureId,
          key: `awayMvp-${fixtureId}-female`,
          formData,
          shouldDelete: tournament.mvpMode !== "gendered",
          teamId: fixture.awayTeamId,
          tournamentId: tournament.id,
        }),
      ];
    });

    await prisma.$transaction(updates);

    const adminBase = `/admin/tournaments/${tournament.slug}`;

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/results");
    revalidatePath("/admin/standings");
    revalidatePath(adminBase);
    revalidatePath(`${adminBase}/results`);
    revalidatePath(`${adminBase}/standings`);
    revalidatePath(`/tournaments/${tournament.slug}`);
    refresh();
    return successState("Scores were saved.");
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteMvpVote(_state: ActionState, formData: FormData) {
  try {
    const voteId = readString(formData, "voteId");

    if (!voteId) {
      throw new Error("No MVP vote was selected.");
    }

    const vote = await prisma.mvpVote.findUniqueOrThrow({
      where: { id: voteId },
      select: {
        playerName: true,
        tournament: {
          select: { slug: true },
        },
      },
    });

    await prisma.mvpVote.delete({
      where: { id: voteId },
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
    const tournamentId = readString(formData, "tournamentId");

    if (!tournamentId) {
      throw new Error("No tournament was selected.");
    }

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { name: true, slug: true },
    });

    const deleted = await prisma.mvpVote.deleteMany({
      where: { tournamentId },
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
  revalidatePath(`${adminBase}/standings`);
  revalidatePath(`/tournaments/${slug}`);
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
