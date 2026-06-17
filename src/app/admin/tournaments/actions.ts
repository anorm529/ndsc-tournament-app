"use server";

import { refresh, revalidatePath, revalidateTag } from "next/cache";

import { prisma } from "@/lib/db";
import { ActionState, errorState, successState } from "@/lib/action-state";
import { requirePermission } from "@/lib/current-admin";
import { Tournament } from "@/lib/tournaments/types";

export async function createTournament(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("tournaments");

    const data = readTournamentForm(formData);
    const pitches = readLines(formData, "pitches");

    const tournament = await prisma.tournament.create({
      data: {
        ...data,
        pitches: {
          create: pitches.map((name, index) => ({
            name,
            sortOrder: index + 1,
          })),
        },
      },
      select: { slug: true },
    });

    revalidateTournamentPages(tournament.slug);
    refresh();
    return successState(`${data.name} was created.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function updateTournament(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("tournaments");

    const tournamentId = requireText(formData, "tournamentId");
    const data = readTournamentForm(formData);
    const pitches = readLines(formData, "pitches");

    const existing = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: {
        pitches: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.update({
        where: { id: tournamentId },
        data,
        select: { slug: true },
      });

      const keepPitchIds: string[] = [];

      for (const [index, name] of pitches.entries()) {
        const existingPitch = existing.pitches[index];

        if (existingPitch) {
          const pitch = await tx.pitch.update({
            where: { id: existingPitch.id },
            data: {
              name,
              sortOrder: index + 1,
            },
            select: { id: true },
          });
          keepPitchIds.push(pitch.id);
        } else {
          const pitch = await tx.pitch.create({
            data: {
              tournamentId,
              name,
              sortOrder: index + 1,
            },
            select: { id: true },
          });
          keepPitchIds.push(pitch.id);
        }
      }

      await tx.pitch.deleteMany({
        where: {
          tournamentId,
          id: {
            notIn: keepPitchIds,
          },
        },
      });

      return tournament;
    });

    revalidateTournamentPages(updated.slug);
    if (existing.slug !== updated.slug) {
      revalidatePath(`/tournaments/${existing.slug}`);
    }

    refresh();
    return successState(`${data.name} was saved.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteTournament(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("tournaments");

    const tournamentId = requireText(formData, "tournamentId");

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { name: true, slug: true },
    });

    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    revalidateTournamentPages(tournament.slug);
    refresh();
    return successState(`${tournament.name} was deleted.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteTournamentPlayers(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("tournaments");

    const tournamentId = requireText(formData, "tournamentId");

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { name: true, slug: true },
    });

    const deleted = await prisma.player.deleteMany({
      where: {
        team: {
          tournamentId,
        },
      },
    });

    revalidateTournamentPages(tournament.slug);
    refresh();
    return successState(`${deleted.count} player record${deleted.count === 1 ? "" : "s"} deleted from ${tournament.name}.`);
  } catch (error) {
    return errorState(error);
  }
}

function readTournamentForm(formData: FormData) {
  const name = requireText(formData, "name");
  const slug = slugify(requireText(formData, "slug"));
  const startsOn = parseDate(requireText(formData, "startsOn"), "Date");
  const venue = requireText(formData, "venue");
  const city = requireText(formData, "city");
  const format = requireOption<Tournament["format"]>(formData, "format", [
    "round-robin",
    "round-robin-playoffs",
  ]);
  const tournamentType = requireOption<Tournament["tournamentType"]>(formData, "tournamentType", [
    "public",
    "internal",
  ]);
  const submittedMvpMode = requireOption<Tournament["mvpMode"]>(formData, "mvpMode", [
    "overall",
    "gendered",
  ]);
  const mvpMode = tournamentType === "internal" ? "gendered" : submittedMvpMode;
  const status = requireOption<Tournament["status"]>(formData, "status", [
    "draft",
    "published",
    "live",
    "complete",
  ]);
  const seasonYear = requireInteger(formData, "seasonYear", 2000);
  const gameMinutes = requireInteger(formData, "gameMinutes", 1);
  const slotGapMinutes = requireInteger(formData, "slotGapMinutes", 0);
  const checkInAt = optionalDatetime(formData, "checkInAt");
  const winPoints = requireInteger(formData, "winPoints", 0);
  const drawPoints = requireInteger(formData, "drawPoints", 0);
  const lossPoints = requireInteger(formData, "lossPoints", 0);
  const announcements = readLines(formData, "announcements");

  return {
    slug,
    name,
    startsOn,
    venue,
    city,
    format,
    tournamentType,
    seasonYear,
    mvpMode,
    status,
    gameMinutes,
    slotGapMinutes,
    checkInAt,
    winPoints,
    drawPoints,
    lossPoints,
    announcements,
  };
}

function readLines(formData: FormData, key: string) {
  const value = readText(formData, key);
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const unique = new Set(lines.map((line) => line.toLowerCase()));

  if (unique.size !== lines.length) {
    throw new Error(`${key} contains duplicates.`);
  }

  return lines;
}

function requireText(formData: FormData, key: string) {
  const value = readText(formData, key).trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function requireOption<TOption extends string>(formData: FormData, key: string, options: TOption[]) {
  const value = requireText(formData, key);

  if (!options.includes(value as TOption)) {
    throw new Error(`${key} is invalid.`);
  }

  return value as TOption;
}

function requireInteger(formData: FormData, key: string, min: number) {
  const value = Number(requireText(formData, key));

  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${key} must be a whole number of at least ${min}.`);
  }

  return value;
}

function parseDate(value: string, label: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
}

function optionalDatetime(formData: FormData, key: string) {
  const value = readText(formData, key).trim();

  if (!value) {
    return null;
  }

  const normalizedValue = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalizedValue}Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid date and time.`);
  }

  return date;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("Slug is required.");
  }

  return slug;
}

function revalidateTournamentPages(slug: string) {
  const adminBase = `/admin/tournaments/${slug}`;

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/tournaments");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/results");
  revalidatePath("/admin/standings");
  revalidatePath(adminBase);
  revalidatePath(`${adminBase}/settings`);
  revalidatePath(`${adminBase}/teams`);
  revalidatePath(`${adminBase}/schedule`);
  revalidatePath(`${adminBase}/results`);
  revalidatePath(`${adminBase}/standings`);
  revalidatePath(`/tournaments/${slug}`);
  revalidateTag("tournament-bundle", "max");
  revalidateTag("tournament-cards", "max");
}
