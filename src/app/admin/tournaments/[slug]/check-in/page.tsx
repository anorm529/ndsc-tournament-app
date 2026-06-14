import { CheckCircle2, Circle, Mail, UserRound } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel, Stat } from "@/components/admin/admin-ui";
import { getTournamentBundle } from "@/lib/tournaments/data";

import { toggleTeamCheckIn } from "../v2-actions";

export const dynamic = "force-dynamic";

export default async function CheckInPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { teams, tournament } = await getTournamentBundle(slug);
  const checkedInCount = teams.filter((team) => team.checkedInAt).length;
  const checkInPercent = teams.length > 0 ? Math.round((checkedInCount / teams.length) * 100) : 0;
  const sortedTeams = [...teams].sort((a, b) => Number(Boolean(a.checkedInAt)) - Number(Boolean(b.checkedInAt)) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team Check-in"
        description="Mark teams as arrived on tournament morning."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={CheckCircle2} label="Checked in" value={`${checkedInCount}`} detail={tournament.name} />
        <Stat icon={Circle} label="Waiting" value={`${teams.length - checkedInCount}`} detail="Not arrived yet" />
        <Stat icon={CheckCircle2} label="Teams" value={`${teams.length}`} detail="Registered" />
      </div>
      <Panel title="Check-in progress">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-600">
            <span>{checkedInCount} of {teams.length} teams checked in</span>
            <span>{checkInPercent}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${checkInPercent}%` }} />
          </div>
          {teams.length > 0 && checkedInCount === teams.length ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              Every team is checked in.
            </p>
          ) : null}
        </div>
      </Panel>
      <Panel title="Teams">
        <div className="grid gap-3 md:grid-cols-2">
          {sortedTeams.map((team) => {
            const checkedIn = Boolean(team.checkedInAt);

            return (
              <div
                key={team.id}
                className={`flex items-center justify-between gap-3 rounded-md border p-4 ${
                  checkedIn ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-bold text-slate-950">{team.name}</p>
                    <span className={`rounded-full px-2 py-1 text-[0.68rem] font-bold uppercase ${checkedIn ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {checkedIn ? "Arrived" : "Waiting"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {checkedIn ? `Checked in at ${new Date(team.checkedInAt!).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}` : "Not checked in"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                    {team.contactName ? (
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-1">
                        <UserRound size={13} /> {team.contactName}
                      </span>
                    ) : null}
                    {team.contactEmail ? (
                      <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-1">
                        <Mail size={13} /> {team.contactEmail}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ActionForm action={toggleTeamCheckIn}>
                  <input name="teamId" type="hidden" value={team.id} />
                  <input name="checkedIn" type="hidden" value={checkedIn ? "true" : "false"} />
                  <SubmitButton className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:bg-slate-200 ${checkedIn ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100" : "bg-emerald-700 text-white hover:bg-emerald-800"}`}>
                    {checkedIn ? "Undo" : "Check in"}
                  </SubmitButton>
                </ActionForm>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
