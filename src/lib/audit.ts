import { prisma } from "@/lib/db";
import { formatRole, getCurrentAdminUser } from "@/lib/current-admin";

export async function getAuditActorData() {
  const actor = await getCurrentAdminUser();

  if (!actor) {
    return {
      actorEmail: null,
      actorName: "System",
      actorRole: null,
    };
  }

  return {
    actorEmail: actor.email,
    actorName: actor.name,
    actorRole: actor.role,
  };
}

export function formatAuditActor({
  actorEmail,
  actorName,
  actorRole,
}: {
  actorEmail: string | null;
  actorName: string | null;
  actorRole: string | null;
}) {
  if (!actorName && !actorEmail && !actorRole) {
    return "Unknown user";
  }

  const name = actorName ?? actorEmail ?? "Unknown user";
  const role = actorRole ? formatRole(actorRole) : "legacy entry";

  return `${name} (${role})`;
}

export async function writeAuditLog({
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
