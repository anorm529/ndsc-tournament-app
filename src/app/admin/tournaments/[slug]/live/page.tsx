import Link from "next/link";
import { MonitorUp } from "lucide-react";

import { PageHeader, Panel } from "@/components/admin/admin-ui";
import { getTournamentBundle } from "@/lib/tournaments/data";

export const dynamic = "force-dynamic";

export default async function AdminLiveDisplayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tournament } = await getTournamentBundle(slug);

  return (
    <div className="space-y-5">
      <PageHeader title="Live Display" description="A public big-screen view for tournament day." />
      <Panel title="Display link">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-950">{tournament.name} live board</p>
            <p className="mt-1 text-sm text-slate-600">Open this on a laptop, TV, or tablet at the tournament desk.</p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
            href={`/tournaments/${tournament.slug}/live`}
            target="_blank"
          >
            <MonitorUp size={16} /> Open display
          </Link>
        </div>
      </Panel>
    </div>
  );
}
