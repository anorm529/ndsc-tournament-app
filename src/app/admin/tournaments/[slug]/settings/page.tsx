import Link from "next/link";
import { Save, Trash2 } from "lucide-react";

import { ActionForm, ConfirmSubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/admin-ui";
import { getTournamentBundle } from "@/lib/tournaments/data";
import { deleteTournamentPlayers } from "@/app/admin/tournaments/actions";

export const dynamic = "force-dynamic";

export default async function AdminTournamentSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { players, tournament } = await getTournamentBundle(slug);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Tournament configuration that drives fixtures, standings, and the public page."
        action={
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            href="/admin/tournaments"
          >
            <Save size={16} /> Edit tournament
          </Link>
        }
      />
      <Panel title="Event Details">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={tournament.name} />
          <Input label="Venue" value={tournament.venue} />
          <Input label="Date" value={tournament.date} />
          <Input label="Status" value={tournament.status} />
        </div>
      </Panel>
      <Panel title="Format and Scoring">
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Format" value={tournament.format} />
          <Input label="Game minutes" value={`${tournament.gameMinutes}`} />
          <Input label="Gap minutes" value={`${tournament.slotGapMinutes}`} />
          <Input label="Win points" value={`${tournament.points.win}`} />
          <Input label="Draw points" value={`${tournament.points.draw}`} />
        </div>
      </Panel>
      <Panel title="Pitches">
        <div className="grid gap-3 md:grid-cols-3">
          {tournament.pitches.map((pitch) => (
            <Input key={pitch} label="Pitch" value={pitch} />
          ))}
        </div>
      </Panel>
      <Panel title="Data Cleanup">
        <div className="flex flex-col gap-4 rounded-md border border-rose-100 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-rose-950">Player records</p>
            <p className="mt-1 text-sm text-rose-800">
              {players.length} player record{players.length === 1 ? "" : "s"} are stored for this tournament.
            </p>
          </div>
          <ActionForm action={deleteTournamentPlayers}>
            <input name="tournamentId" type="hidden" value={tournament.id} />
            <ConfirmSubmitButton
              confirmMessage={`Delete all player records for ${tournament.name}? Teams, fixtures, scores, and MVP votes will stay.`}
            >
              <Trash2 size={16} /> Delete players
            </ConfirmSubmitButton>
          </ActionForm>
        </div>
      </Panel>
    </div>
  );
}

function Input({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium" defaultValue={value} />
    </label>
  );
}
