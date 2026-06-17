"use server";

import { refresh, revalidatePath, revalidateTag } from "next/cache";

import { prisma } from "@/lib/db";
import { ActionState, errorState, successState } from "@/lib/action-state";
import { requirePermission } from "@/lib/current-admin";

export async function createTeam(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("tournaments");

    const tournamentId = requireText(formData, "tournamentId");
    const data = readTeamForm(formData);

    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      select: { slug: true },
    });

    await prisma.team.create({
      data: {
        tournamentId,
        ...data,
      },
    });

    revalidateTeamPages(tournament.slug);
    refresh();
    return successState(`${data.name} was added.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function updateTeam(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("tournaments");

    const teamId = requireText(formData, "teamId");
    const data = readTeamForm(formData);

    const existingTeam = await prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      select: {
        tournament: {
          select: { slug: true },
        },
      },
    });

    await prisma.team.update({
      where: { id: teamId },
      data,
    });

    revalidateTeamPages(existingTeam.tournament.slug);
    refresh();
    return successState(`${data.name} was saved.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteTeam(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("tournaments");

    const teamId = requireText(formData, "teamId");

    const existingTeam = await prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      select: {
        name: true,
        tournament: {
          select: { slug: true },
        },
      },
    });

    await prisma.team.delete({
      where: { id: teamId },
    });

    revalidateTeamPages(existingTeam.tournament.slug);
    refresh();
    return successState(`${existingTeam.name} was deleted.`);
  } catch (error) {
    return errorState(error);
  }
}

function readTeamForm(formData: FormData) {
  const name = requireText(formData, "name");
  const shortName = requireText(formData, "shortName").toUpperCase();
  const colour = requireText(formData, "colour");
  const contactName = optionalText(formData, "contactName");
  const contactEmail = optionalText(formData, "contactEmail");

  if (shortName.length > 5) {
    throw new Error("Short name should be 5 characters or fewer.");
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(colour)) {
    throw new Error("Team colour must be a valid hex colour.");
  }

  if (contactEmail && !contactEmail.includes("@")) {
    throw new Error("Captain email must be a valid email address.");
  }

  return {
    name,
    shortName,
    colour,
    contactName,
    contactEmail,
  };
}

function requireText(formData: FormData, key: string) {
  const value = optionalText(formData, key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function optionalText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function revalidateTeamPages(slug: string) {
  const adminBase = `/admin/tournaments/${slug}`;

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/results");
  revalidatePath("/admin/standings");
  revalidatePath(adminBase);
  revalidatePath(`${adminBase}/teams`);
  revalidatePath(`${adminBase}/schedule`);
  revalidatePath(`${adminBase}/results`);
  revalidatePath(`${adminBase}/standings`);
  revalidatePath(`/tournaments/${slug}`);
  revalidateTag("tournament-bundle", "max");
  revalidateTag("tournament-cards", "max");
}
