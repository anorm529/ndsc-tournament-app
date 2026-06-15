import { prisma } from "@/lib/db";

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
  await prisma.auditLog.create({
    data: {
      action,
      entityId,
      entityType,
      summary,
      tournamentId,
    },
  });
}
