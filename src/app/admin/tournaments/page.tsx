import Link from "next/link";
import { Plus, Save, Trash2 } from "lucide-react";

import { ActionForm, ConfirmSubmitButton } from "@/components/admin/action-form";
import { ButtonShell, PageHeader, Panel } from "@/components/admin/admin-ui";
import { getTournaments } from "@/lib/tournaments/data";
import { createTournament, deleteTournament, updateTournament } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminTournamentsPage() {
  const tournaments = await getTournaments();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tournaments"
        description="Create events, draft settings, and keep an archive of past one-day tournaments."
      />

      <Panel title="Create Tournament">
        <ActionForm action={createTournament} className="space-y-4">
          <TournamentFields
            defaults={{
              city: "Bangor",
              drawPoints: "1",
              format: "round-robin",
              gameMinutes: "45",
              lossPoints: "0",
              mvpMode: "overall",
              pitches: "Diamond 1\nDiamond 2",
              seasonYear: `${new Date().getFullYear()}`,
              slotGapMinutes: "0",
              status: "draft",
              tournamentType: "public",
              venue: "Ward Park, Bangor",
              winPoints: "3",
            }}
          />
          <ButtonShell><Plus size={16} /> Create tournament</ButtonShell>
        </ActionForm>
      </Panel>

      <div className="grid gap-5">
        {tournaments.map((event) => (
          <Panel
            key={event.id}
            title={event.name}
            action={
              <div className="flex flex-wrap gap-3">
                <Link
                  className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                  href={`/admin/tournaments/${event.slug}`}
                >
                  Manage
                </Link>
                <Link
                  className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                  href={`/tournaments/${event.slug}`}
                >
                  Public page
                </Link>
              </div>
            }
          >
            <ActionForm action={updateTournament} className="space-y-4">
              <input name="tournamentId" type="hidden" value={event.id} />
              <TournamentFields
                defaults={{
                  announcements: event.announcements.join("\n"),
                  checkInAt: toDatetimeLocalInput(event.checkInTime),
                  city: event.city,
                  drawPoints: `${event.points.draw}`,
                  format: event.format,
                  gameMinutes: `${event.gameMinutes}`,
                  lossPoints: `${event.points.loss}`,
                  mvpMode: event.mvpMode,
                  name: event.name,
                  pitches: event.pitches.join("\n"),
                  seasonYear: `${event.seasonYear}`,
                  slug: event.slug,
                  slotGapMinutes: `${event.slotGapMinutes}`,
                  startsOn: toDateInput(event.date),
                  status: event.status,
                  tournamentType: event.tournamentType,
                  venue: event.venue,
                  winPoints: `${event.points.win}`,
                }}
              />
              <ButtonShell><Save size={16} /> Save tournament</ButtonShell>
            </ActionForm>
            <ActionForm action={deleteTournament} className="mt-4 border-t border-slate-100 pt-4">
              <input name="tournamentId" type="hidden" value={event.id} />
              <ConfirmSubmitButton
                confirmMessage={`Delete ${event.name}? This also deletes its teams, fixtures, scores, MVP votes, pitches, and bracket data.`}
              >
                <Trash2 size={16} /> Delete tournament
              </ConfirmSubmitButton>
            </ActionForm>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function TournamentFields({
  defaults,
}: {
  defaults: Partial<Record<FieldName, string>>;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TextField label="Name" name="name" placeholder="Leading Ladies" required value={defaults.name} />
        <TextField label="Slug" name="slug" placeholder="leading-ladies-2026" required value={defaults.slug} />
        <TextField label="Date" name="startsOn" required type="date" value={defaults.startsOn} />
        <TextField label="Check-in" name="checkInAt" type="datetime-local" value={defaults.checkInAt} />
        <TextField label="Venue" name="venue" required value={defaults.venue} />
        <TextField label="City" name="city" required value={defaults.city} />
        <SelectField
          label="Format"
          name="format"
          options={[
            ["round-robin", "Round robin"],
            ["round-robin-playoffs", "Round robin + playoffs"],
          ]}
          value={defaults.format}
        />
        <SelectField
          label="Status"
          name="status"
          options={[
            ["draft", "Draft"],
            ["published", "Published"],
            ["live", "Live"],
            ["complete", "Complete"],
          ]}
          value={defaults.status}
        />
        <SelectField
          label="Area"
          name="tournamentType"
          options={[
            ["public", "Club/public"],
            ["internal", "Internal NDSC"],
          ]}
          value={defaults.tournamentType}
        />
        <TextField label="Season year" min={2000} name="seasonYear" required type="number" value={defaults.seasonYear} />
        <SelectField
          label="MVP mode"
          name="mvpMode"
          options={[
            ["overall", "One MVP"],
            ["gendered", "Male + female"],
          ]}
          value={defaults.mvpMode}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <TextField label="Game minutes" min={1} name="gameMinutes" required type="number" value={defaults.gameMinutes} />
        <TextField label="Gap minutes" min={0} name="slotGapMinutes" required type="number" value={defaults.slotGapMinutes} />
        <TextField label="Win points" min={0} name="winPoints" required type="number" value={defaults.winPoints} />
        <TextField label="Draw points" min={0} name="drawPoints" required type="number" value={defaults.drawPoints} />
        <TextField label="Loss points" min={0} name="lossPoints" required type="number" value={defaults.lossPoints} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <TextareaField
          label="Announcements"
          name="announcements"
          placeholder="One public announcement per line"
          value={defaults.announcements}
        />
        <TextareaField
          label="Pitches"
          name="pitches"
          placeholder="One pitch per line"
          value={defaults.pitches}
        />
      </div>
    </>
  );
}

type FieldName =
  | "announcements"
  | "checkInAt"
  | "city"
  | "drawPoints"
  | "format"
  | "gameMinutes"
  | "lossPoints"
  | "mvpMode"
  | "name"
  | "pitches"
  | "seasonYear"
  | "slug"
  | "slotGapMinutes"
  | "startsOn"
  | "status"
  | "tournamentType"
  | "venue"
  | "winPoints";

function TextField({
  label,
  min,
  name,
  placeholder,
  required,
  type = "text",
  value,
}: {
  label: string;
  min?: number;
  name: FieldName;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input
        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
        defaultValue={value}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: FieldName;
  options: Array<[string, string]>;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select
        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
        defaultValue={value}
        name={name}
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({
  label,
  name,
  placeholder,
  value,
}: {
  label: string;
  name: FieldName;
  placeholder?: string;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <textarea
        className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
        defaultValue={value}
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toDatetimeLocalInput(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}
