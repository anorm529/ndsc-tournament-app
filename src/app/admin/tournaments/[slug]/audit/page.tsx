import { History } from "lucide-react";

import { PageHeader, Panel, Stat } from "@/components/admin/admin-ui";
import { formatAuditActor } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getTournamentBundle } from "@/lib/tournaments/data";

export const dynamic = "force-dynamic";

export default async function AuditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tournament } = await getTournamentBundle(slug);
  const logs = await prisma.auditLog.findMany({
    where: { tournamentId: tournament.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" description="Operational history for key V2 admin actions." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={History} label="Events" value={`${logs.length}`} detail="Latest 100" />
      </div>
      <Panel title="Recent activity">
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-slate-950">{log.summary}</p>
                <p className="text-xs font-semibold text-slate-500">{log.createdAt.toISOString().replace("T", " ").slice(0, 16)}</p>
              </div>
              <div className="mt-2 flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>{log.entityType} - {log.action}</p>
                <p>{formatAuditActor(log)}</p>
              </div>
            </div>
          ))}
          {logs.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-600">
              Audit entries will appear as V2 admin actions are used.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
