import { Plus, Save, Trash2 } from "lucide-react";

import { ActionForm, ConfirmSubmitButton } from "@/components/admin/action-form";
import { ButtonShell, PageHeader, Panel } from "@/components/admin/admin-ui";
import { getTournamentBundle } from "@/lib/tournaments/data";
import { createTeam, deleteTeam, updateTeam } from "@/app/admin/teams/actions";

export const dynamic = "force-dynamic";

export default async function AdminTournamentTeamsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { teams, tournament } = await getTournamentBundle(slug);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teams"
        description={`Manage registered teams and captains for ${tournament.name}.`}
      />

      <Panel title="Add Team">
        <ActionForm action={createTeam} className="grid gap-3 lg:grid-cols-[1.2fr_0.6fr_0.45fr_1fr_1.2fr_auto]">
          <input name="tournamentId" type="hidden" value={tournament.id} />
          <TextField label="Team name" name="name" placeholder="Bangor Bats" required />
          <TextField label="Short name" maxLength={5} name="shortName" placeholder="BAT" required />
          <ColourField label="Colour" name="colour" value="#0f172a" />
          <TextField label="Captain" name="contactName" placeholder="Captain name" />
          <TextField label="Captain email" name="contactEmail" placeholder="captain@example.com" type="email" />
          <div className="flex items-end">
            <ButtonShell><Plus size={16} /> Add</ButtonShell>
          </div>
        </ActionForm>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        {teams.map((team) => (
          <Panel
            key={team.id}
            title={team.name}
            action={
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <span className="size-3 rounded-full" style={{ backgroundColor: team.colour }} />
                {team.shortName}
              </span>
            }
          >
            <ActionForm action={updateTeam} className="grid gap-3 sm:grid-cols-2">
              <input name="teamId" type="hidden" value={team.id} />
              <TextField label="Team name" name="name" value={team.name} required />
              <TextField label="Short name" maxLength={5} name="shortName" value={team.shortName} required />
              <ColourField label="Colour" name="colour" value={team.colour} />
              <TextField label="Captain" name="contactName" value={team.contactName ?? ""} />
              <TextField label="Captain email" name="contactEmail" type="email" value={team.contactEmail ?? ""} />
              <div className="flex items-end">
                <ButtonShell><Save size={16} /> Save</ButtonShell>
              </div>
            </ActionForm>
            <ActionForm action={deleteTeam} className="mt-4 border-t border-slate-100 pt-4">
              <input name="teamId" type="hidden" value={team.id} />
              <ConfirmSubmitButton
                confirmMessage={`Delete ${team.name}? This also deletes this team's players, fixtures, and MVP votes.`}
              >
                <Trash2 size={16} /> Delete team
              </ConfirmSubmitButton>
            </ActionForm>
          </Panel>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        Players are handled by each team. This admin area only tracks team identity and captain contacts.
      </p>
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
  maxLength,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input
        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
        defaultValue={value}
        maxLength={maxLength}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function ColourField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input
        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-2"
        defaultValue={value}
        name={name}
        type="color"
      />
    </label>
  );
}
