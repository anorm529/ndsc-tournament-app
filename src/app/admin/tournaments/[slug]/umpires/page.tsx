import { AlertTriangle, ClipboardCheck, MapPinned, Plus, Trash2, UserCheck, Wand2 } from "lucide-react";

import { ActionForm, ConfirmSubmitButton, SubmitButton } from "@/components/admin/action-form";
import { ButtonShell, PageHeader, Panel, Stat } from "@/components/admin/admin-ui";
import { prisma } from "@/lib/db";
import { getTournamentBundle } from "@/lib/tournaments/data";

import { assignDefaultPitchUmpires, createUmpire, deleteUmpire } from "../v2-actions";

export const dynamic = "force-dynamic";

export default async function UmpiresPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { teams, tournament } = await getTournamentBundle(slug);
  const [pitches, umpires, fixtureRows] = await Promise.all([
    prisma.pitch.findMany({ where: { tournamentId: tournament.id }, orderBy: { sortOrder: "asc" } }),
    prisma.umpire.findMany({
      where: { tournamentId: tournament.id },
      include: { defaultPitch: true, team: true },
      orderBy: { name: "asc" },
    }),
    prisma.fixture.findMany({
      where: { tournamentId: tournament.id },
      include: {
        awayTeam: true,
        homeTeam: true,
        pitch: true,
        umpireAssignments: { include: { umpire: { include: { team: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ startsAt: "asc" }, { pitch: { sortOrder: "asc" } }],
    }),
  ]);
  const fixturesWithUmpires = fixtureRows.filter((fixture) => fixture.umpireAssignments.length > 0).length;
  const unassignedFixtures = fixtureRows.length - fixturesWithUmpires;
  const coveragePercent = fixtureRows.length > 0 ? Math.round((fixturesWithUmpires / fixtureRows.length) * 100) : 0;
  const conflictRows = fixtureRows.flatMap((fixture) =>
    fixture.umpireAssignments
      .filter((assignment) => assignment.umpire.teamId === fixture.homeTeamId || assignment.umpire.teamId === fixture.awayTeamId)
      .map((assignment) => `${assignment.umpire.name} is assigned to ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`),
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Umpires" description="Add umpires and map them to their default diamond." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={UserCheck} label="Umpires" value={`${umpires.length}`} detail="Available" />
        <Stat icon={ClipboardCheck} label="Covered games" value={`${fixturesWithUmpires}/${fixtureRows.length}`} detail={`${coveragePercent}% assigned`} />
        <Stat icon={MapPinned} label="Diamonds" value={`${pitches.length}`} detail={`${unassignedFixtures} without umpires`} />
      </div>
      <Panel title="Add umpire">
        <ActionForm action={createUmpire} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
          <input name="tournamentId" type="hidden" value={tournament.id} />
          <TextField label="Name" name="name" required />
          <TextField label="Email" name="email" />
          <TextField label="Phone" name="phone" />
          <TextField label="Availability" name="availabilityNote" placeholder="Morning only" />
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Home team</span>
            <select className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium" name="teamId">
              <option value="">Neutral / none</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Default diamond</span>
            <select className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium" name="defaultPitchId">
              <option value="">Unassigned</option>
              {pitches.map((pitch) => (
                <option key={pitch.id} value={pitch.id}>{pitch.name}</option>
              ))}
            </select>
          </label>
          <ButtonShell><Plus size={16} /> Add</ButtonShell>
        </ActionForm>
      </Panel>
      <Panel
        title="Umpire list"
        action={
          <ActionForm action={assignDefaultPitchUmpires}>
            <input name="tournamentId" type="hidden" value={tournament.id} />
            <SubmitButton><Wand2 size={16} /> Assign to fixtures</SubmitButton>
          </ActionForm>
        }
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {umpires.map((umpire) => (
            <div key={umpire.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-950">{umpire.name}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">{umpire.defaultPitch?.name ?? "No default diamond"}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">{umpire.team?.name ? `Home team: ${umpire.team.name}` : "No team conflict check"}</p>
                {umpire.availabilityNote ? (
                  <p className="mt-2 text-xs font-semibold text-slate-500">{umpire.availabilityNote}</p>
                ) : null}
              </div>
              <ActionForm action={deleteUmpire}>
                <input name="umpireId" type="hidden" value={umpire.id} />
                <ConfirmSubmitButton confirmMessage={`Remove ${umpire.name}?`}>
                  <Trash2 size={14} /> Delete
                </ConfirmSubmitButton>
              </ActionForm>
            </div>
          ))}
          {umpires.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              Add umpires here, then set a default diamond so the schedule can assign them automatically.
            </p>
          ) : null}
        </div>
      </Panel>
      <Panel title="Fixture coverage">
        <div className="space-y-3">
          {conflictRows.length > 0 ? (
            <div className="space-y-2">
              {conflictRows.map((warning) => (
                <p key={warning} className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                  <AlertTriangle size={16} /> {warning}
                </p>
              ))}
            </div>
          ) : null}
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${coveragePercent}%` }} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {fixtureRows.slice(0, 8).map((fixture) => (
              <div key={fixture.id} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      {fixture.startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} - {fixture.pitch?.name ?? "No diamond"}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[0.68rem] font-bold uppercase ${fixture.umpireAssignments.length > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {fixture.umpireAssignments.length > 0 ? "Covered" : "Missing"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  {fixture.umpireAssignments.length > 0
                    ? fixture.umpireAssignments.map((assignment) => assignment.umpire.name).join(", ")
                    : "No umpire assigned yet"}
                </p>
              </div>
            ))}
          </div>
          {fixtureRows.length > 8 ? (
            <p className="text-xs font-semibold text-slate-500">Showing the first 8 fixtures. Re-run assignment after changing default diamonds.</p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function TextField({ label, name, placeholder, required }: { label: string; name: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium" name={name} placeholder={placeholder} required={required} />
    </label>
  );
}
