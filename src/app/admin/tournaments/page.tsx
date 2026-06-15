import Link from "next/link";
import { ReactNode } from "react";
import { CalendarDays, Eye, MapPin, Pencil, Plus, Settings, Shield, Trash2, Trophy, Users } from "lucide-react";

import { ActionForm, ConfirmSubmitButton } from "@/components/admin/action-form";
import { ButtonShell, PageHeader, Panel } from "@/components/admin/admin-ui";
import { canUseMinimumRole } from "@/lib/current-admin";
import { getTournamentCards } from "@/lib/tournaments/data";
import { TournamentCard } from "@/lib/tournaments/types";
import { createTournament, deleteTournament, updateTournament } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminTournamentsPage() {
  const [tournaments, canManageTournaments] = await Promise.all([
    getTournamentCards(),
    canUseMinimumRole("tournament_admin"),
  ]);

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Tournaments"
        description="Create events, draft settings, and keep an archive of past one-day tournaments."
      />

      {canManageTournaments ? (
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
      ) : (
        <Panel title="Tournament Access">
          <p className="text-sm font-medium text-slate-600">
            Your role can view tournaments and enter results, but only tournament admins and owners can create, edit, or delete tournaments.
          </p>
        </Panel>
      )}

      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-950">Tournament Index</h2>
            <p className="mt-1 text-sm text-slate-600">Pick the event you want, then manage its teams, schedule, scores, and settings.</p>
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {tournaments.length} tournament{tournaments.length === 1 ? "" : "s"}
          </p>
        </div>

        {tournaments.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm font-semibold text-slate-500">
            No tournaments yet. Create the first one above.
          </div>
        ) : (
          <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
            {tournaments.map((event) => (
              <TournamentAdminCard canManageTournaments={canManageTournaments} key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentAdminCard({
  canManageTournaments,
  event,
}: {
  canManageTournaments: boolean;
  event: TournamentCard;
}) {
  return (
    <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={event.status} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
              {event.tournamentType === "internal" ? "Internal" : "Public"}
            </span>
            {!event.schedulePublished && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">
                Draft schedule
              </span>
            )}
          </div>
          <h3 className="mt-3 break-words text-2xl font-bold text-slate-950">{event.name}</h3>
          <div className="mt-3 grid gap-2 text-sm font-medium text-slate-600">
            <span className="inline-flex min-w-0 items-center gap-2">
              <CalendarDays size={16} className="shrink-0" /> <span className="min-w-0 break-words">{formatDate(event.date)}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <MapPin size={16} className="shrink-0" /> <span className="min-w-0 break-words">{event.venue}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <Shield size={16} className="shrink-0" />
              <span className="min-w-0 break-words">
                {formatLabel(event.format)} · {event.gameMinutes} min games
                {event.slotGapMinutes > 0 ? ` + ${event.slotGapMinutes} min gap` : ""}
              </span>
            </span>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
          <Link
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 sm:flex-none"
            href={`/admin/tournaments/${event.slug}`}
          >
            <Settings size={16} /> Manage
          </Link>
          <Link
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 sm:flex-none"
            href={`/tournaments/${event.slug}`}
          >
            <Eye size={16} /> Public
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniStat icon={<Users size={16} />} label="Teams" value={`${event.teamsCount}`} />
        <MiniStat icon={<Trophy size={16} />} label="Games" value={`${event.playedFixturesCount}/${event.fixturesCount}`} />
        <MiniStat icon={<MapPin size={16} />} label="Pitches" value={`${event.pitches.length}`} />
      </div>

      {canManageTournaments ? (
        <details className="mt-5 border-t border-slate-100 pt-4">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-slate-950">
            <Pencil size={16} /> Edit settings
          </summary>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
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
              <ButtonShell><Pencil size={16} /> Save changes</ButtonShell>
            </ActionForm>
            <ActionForm action={deleteTournament} className="mt-4 border-t border-slate-200 pt-4">
              <input name="tournamentId" type="hidden" value={event.id} />
              <ConfirmSubmitButton
                confirmMessage={`Delete ${event.name}? This also deletes its teams, fixtures, scores, MVP votes, pitches, and bracket data.`}
              >
                <Trash2 size={16} /> Delete tournament
              </ConfirmSubmitButton>
            </ActionForm>
          </div>
        </details>
      ) : null}
    </article>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: TournamentCard["status"] }) {
  const className =
    status === "live"
      ? "bg-emerald-100 text-emerald-800"
      : status === "complete"
        ? "bg-slate-200 text-slate-700"
        : status === "published"
          ? "bg-sky-100 text-sky-800"
          : "bg-amber-100 text-amber-800";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${className}`}>
      {status}
    </span>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ");
}
