"use server";

import { refresh, revalidatePath, revalidateTag } from "next/cache";

import { ActionState, errorState, successState } from "@/lib/action-state";
import { getAuditActorData } from "@/lib/audit";
import { requirePermission } from "@/lib/current-admin";
import { prisma } from "@/lib/db";

export async function toggleTeamCheckIn(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("check_in");

    const teamId = requireText(formData, "teamId");
    const checkedIn = formData.get("checkedIn") === "true";
    const team = await prisma.team.update({
      where: { id: teamId },
      data: { checkedInAt: checkedIn ? null : new Date() },
      include: { tournament: { select: { id: true, slug: true } } },
    });

    await writeAudit({
      tournamentId: team.tournament.id,
      entityType: "team",
      entityId: team.id,
      action: checkedIn ? "check_out" : "check_in",
      summary: `${team.name} was marked ${checkedIn ? "not checked in" : "checked in"}.`,
    });
    revalidateTournament(team.tournament.slug);
    refresh();
    return successState(`${team.name} ${checkedIn ? "checked out" : "checked in"}.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function createUmpire(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

    const tournamentId = requireText(formData, "tournamentId");
    const pitchId = optionalText(formData, "defaultPitchId");
    const teamId = optionalText(formData, "teamId");
    const umpire = await prisma.umpire.create({
      data: {
        tournamentId,
        teamId: teamId || null,
        name: requireText(formData, "name"),
        email: optionalText(formData, "email"),
        phone: optionalText(formData, "phone"),
        availabilityNote: optionalText(formData, "availabilityNote"),
        defaultPitchId: pitchId || null,
      },
      include: { tournament: { select: { slug: true } } },
    });

    await writeAudit({
      tournamentId,
      entityType: "umpire",
      entityId: umpire.id,
      action: "create",
      summary: `${umpire.name} was added as an umpire.`,
    });
    revalidateTournament(umpire.tournament.slug);
    refresh();
    return successState(`${umpire.name} added.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteUmpire(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

    const umpireId = requireText(formData, "umpireId");
    const umpire = await prisma.umpire.findUniqueOrThrow({
      where: { id: umpireId },
      include: { tournament: { select: { id: true, slug: true } } },
    });

    await prisma.umpire.delete({ where: { id: umpireId } });
    await writeAudit({
      tournamentId: umpire.tournament.id,
      entityType: "umpire",
      entityId: umpire.id,
      action: "delete",
      summary: `${umpire.name} was removed from the umpire list.`,
    });
    revalidateTournament(umpire.tournament.slug);
    refresh();
    return successState(`${umpire.name} removed.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function assignDefaultPitchUmpires(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

    const tournamentId = requireText(formData, "tournamentId");
    const tournament = await prisma.tournament.findUniqueOrThrow({
      where: { id: tournamentId },
      include: {
        fixtures: {
          where: { pitchId: { not: null } },
          select: { id: true, pitchId: true },
        },
        umpires: {
          where: { defaultPitchId: { not: null } },
          select: { id: true, defaultPitchId: true },
        },
      },
    });

    const fixtureUmpires = tournament.fixtures.flatMap((fixture) =>
      tournament.umpires
        .filter((umpire) => umpire.defaultPitchId === fixture.pitchId)
        .map((umpire) => ({
          fixtureId: fixture.id,
          umpireId: umpire.id,
          role: "diamond",
        })),
    );

    if (fixtureUmpires.length === 0) {
      return errorState("No default pitch umpire assignments were available.");
    }

    await prisma.fixtureUmpire.createMany({
      data: fixtureUmpires,
      skipDuplicates: true,
    });
    await writeAudit({
      tournamentId,
      entityType: "fixture",
      action: "assign_umpires",
      summary: `${fixtureUmpires.length} fixture umpire assignment${fixtureUmpires.length === 1 ? "" : "s"} checked from default diamond assignments.`,
    });
    revalidateTournament(tournament.slug);
    refresh();
    return successState("Default diamond umpires assigned to matching fixtures.");
  } catch (error) {
    return errorState(error);
  }
}

export async function createTournamentTemplate(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

    const tournamentId = optionalText(formData, "tournamentId");
    const template = await prisma.tournamentTemplate.create({
      data: {
        tournamentId: tournamentId || null,
        name: requireText(formData, "name"),
        description: optionalText(formData, "description"),
        teamCount: requireInteger(formData, "teamCount", 2),
        pitchCount: requireInteger(formData, "pitchCount", 1),
        format: requireOption(formData, "format", ["round-robin", "round-robin-playoffs"]),
        gameMinutes: requireInteger(formData, "gameMinutes", 1),
        slotGapMinutes: requireInteger(formData, "slotGapMinutes", 0),
        includeThirdPlace: formData.get("includeThirdPlace") === "on",
        includeFifthPlace: formData.get("includeFifthPlace") === "on",
      },
      include: { tournament: { select: { slug: true } } },
    });

    if (tournamentId) {
      await writeAudit({
        tournamentId,
        entityType: "template",
        entityId: template.id,
        action: "create",
        summary: `${template.name} template was created.`,
      });
    }
    revalidateTournament(template.tournament?.slug);
    refresh();
    return successState(`${template.name} template created.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function applyTournamentTemplate(_state: ActionState, formData: FormData) {
  try {
    await requirePermission("schedule");

    const tournamentId = requireText(formData, "tournamentId");
    const templateId = requireText(formData, "templateId");
    const template = await prisma.tournamentTemplate.findUniqueOrThrow({
      where: { id: templateId },
    });
    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        format: template.format,
        gameMinutes: template.gameMinutes,
        slotGapMinutes: template.slotGapMinutes,
      },
      select: { slug: true },
    });

    await writeAudit({
      tournamentId,
      entityType: "template",
      entityId: template.id,
      action: "apply",
      summary: `${template.name} template settings were applied.`,
    });
    revalidateTournament(tournament.slug);
    refresh();
    return successState(`${template.name} applied.`);
  } catch (error) {
    return errorState(error);
  }
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
  return typeof value === "string" ? value.trim() : "";
}

function requireInteger(formData: FormData, key: string, min: number) {
  const value = Number(requireText(formData, key));

  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${key} must be a whole number of at least ${min}.`);
  }

  return value;
}

function requireOption<TOption extends string>(formData: FormData, key: string, options: TOption[]) {
  const value = requireText(formData, key);

  if (!options.includes(value as TOption)) {
    throw new Error(`${key} is invalid.`);
  }

  return value as TOption;
}

async function writeAudit({
  action,
  entityId,
  entityType,
  summary,
  tournamentId,
}: {
  action: string;
  entityId?: string;
  entityType: string;
  summary: string;
  tournamentId?: string;
}) {
  const actorData = await getAuditActorData();

  await prisma.auditLog.create({
    data: {
      action,
      ...actorData,
      entityId,
      entityType,
      summary,
      tournamentId,
    },
  });
}

function revalidateTournament(slug?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/tournaments");
  revalidateTag("tournament-bundle", "max");
  revalidateTag("tournament-cards", "max");

  if (!slug) {
    return;
  }

  const base = `/admin/tournaments/${slug}`;
  revalidatePath(base);
  revalidatePath(`${base}/check-in`);
  revalidatePath(`${base}/umpires`);
  revalidatePath(`${base}/templates`);
  revalidatePath(`${base}/schedule`);
  revalidatePath(`${base}/live`);
  revalidatePath(`${base}/audit`);
  revalidatePath(`/tournaments/${slug}`);
}
