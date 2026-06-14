import { Archive, Plus, Wand2 } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { ButtonShell, PageHeader, Panel, Stat } from "@/components/admin/admin-ui";
import { prisma } from "@/lib/db";
import { getTournamentBundle } from "@/lib/tournaments/data";

import { applyTournamentTemplate, createTournamentTemplate } from "../v2-actions";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tournament } = await getTournamentBundle(slug);
  const templates = await prisma.tournamentTemplate.findMany({
    where: {
      OR: [{ tournamentId: tournament.id }, { tournamentId: null }],
    },
    orderBy: [{ tournamentId: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Tournament Templates" description="Save and reuse common NDSC tournament formats." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Archive} label="Templates" value={`${templates.length}`} detail="Available here" />
        <Stat icon={Wand2} label="Current format" value={tournament.format.replaceAll("-", " ")} />
        <Stat icon={Plus} label="Game length" value={`${tournament.gameMinutes}`} detail={`${tournament.slotGapMinutes} min gap`} />
      </div>
      <Panel title="Create template">
        <ActionForm action={createTournamentTemplate} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input name="tournamentId" type="hidden" value={tournament.id} />
          <TextField label="Name" name="name" placeholder="5-team NDSC day" required />
          <TextField label="Description" name="description" placeholder="Round robin plus final placements" />
          <TextField label="Team count" name="teamCount" type="number" value="5" required />
          <TextField label="Pitch count" name="pitchCount" type="number" value="2" required />
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">Format</span>
            <select className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium" name="format" defaultValue="round-robin-playoffs">
              <option value="round-robin">Round robin</option>
              <option value="round-robin-playoffs">Round robin + playoffs</option>
            </select>
          </label>
          <TextField label="Game minutes" name="gameMinutes" type="number" value={`${tournament.gameMinutes}`} required />
          <TextField label="Gap minutes" name="slotGapMinutes" type="number" value={`${tournament.slotGapMinutes}`} required />
          <div className="space-y-2 self-end">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input className="size-4 rounded border-slate-300" name="includeThirdPlace" type="checkbox" defaultChecked />
              Includes 3rd place
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input className="size-4 rounded border-slate-300" name="includeFifthPlace" type="checkbox" />
              Includes 5th place
            </label>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <ButtonShell><Plus size={16} /> Save template</ButtonShell>
          </div>
        </ActionForm>
      </Panel>
      <Panel title="Available templates">
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-950">{template.name}</p>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {template.teamCount} teams, {template.pitchCount} pitches, {template.gameMinutes} min + {template.slotGapMinutes} gap
                  </p>
                </div>
                <ActionForm action={applyTournamentTemplate}>
                  <input name="tournamentId" type="hidden" value={tournament.id} />
                  <input name="templateId" type="hidden" value={template.id} />
                  <SubmitButton><Wand2 size={14} /> Apply</SubmitButton>
                </ActionForm>
              </div>
              {template.description ? <p className="mt-3 text-sm text-slate-600">{template.description}</p> : null}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function TextField({
  label,
  name,
  placeholder,
  required,
  type = "text",
  value,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium" defaultValue={value} name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}
