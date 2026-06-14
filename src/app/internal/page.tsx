import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Medal, Trophy, type LucideIcon } from "lucide-react";

import { getInternalSeasonLeaderboard } from "@/lib/tournaments/data";
import { formatDate } from "@/lib/tournaments/format";

export const dynamic = "force-dynamic";

export default async function InternalSeasonPage() {
  const season = await getInternalSeasonLeaderboard();
  const champion = season.teamRows[0];
  const maleMvpRows = season.mvpRows.filter((row) => row.category === "male");
  const femaleMvpRows = season.mvpRows.filter((row) => row.category === "female");
  const topMaleMvp = maleMvpRows[0];
  const topFemaleMvp = femaleMvpRows[0];

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft size={16} /> Club tournaments
          </Link>
          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">
                NDSC internal league
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                {season.seasonYear} Season
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Yearly team points and MVP leaderboards from internal NDSC tournaments.
              </p>
            </div>
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Stat icon={Trophy} label="Current leader" value={champion?.teamName ?? "TBC"} />
              <Stat icon={Medal} label="Total male MVP" value={formatMvpLeader(topMaleMvp)} />
              <Stat icon={Medal} label="Total female MVP" value={formatMvpLeader(topFemaleMvp)} />
              <Stat icon={CalendarDays} label="Events" value={`${season.tournaments.length}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Team Leaderboard</h2>
                <p className="mt-1 text-sm text-slate-600">Points are awarded from final tournament placements.</p>
              </div>
              <span className="text-sm font-bold text-slate-500">{season.teamRows.length} teams</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-3 pr-4">Team</th>
                    <th className="px-3 py-3 text-center">Events</th>
                    <th className="px-3 py-3 text-center">Wins</th>
                    <th className="px-3 py-3 text-center">Top 3</th>
                    <th className="py-3 pl-3 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {season.teamRows.map((row, index) => (
                    <tr key={row.teamName} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 font-semibold text-slate-950">
                        <span className="mr-3 inline-flex size-6 items-center justify-center rounded bg-slate-100 text-xs text-slate-600">
                          {index + 1}
                        </span>
                        {row.teamName}
                      </td>
                      <td className="px-3 py-3 text-center">{row.eventsPlayed}</td>
                      <td className="px-3 py-3 text-center">{row.wins}</td>
                      <td className="px-3 py-3 text-center">{row.topThreeFinishes}</td>
                      <td className="py-3 pl-3 text-right font-black">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {season.teamRows.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-600">
                  Completed internal tournament placements will appear here.
                </p>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Internal Tournaments</h2>
                <p className="mt-1 text-sm text-slate-600">Events contributing to this season.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {season.tournaments.map((event) => (
                <Link
                  key={event.id}
                  href={`/tournaments/${event.slug}`}
                  className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
                >
                  <p className="text-xs font-bold uppercase text-rose-700">{event.status}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">{event.name}</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-600">{formatDate(event.date)}</p>
                  <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-rose-700 group-hover:text-rose-900">
                    Open tournament <ArrowRight size={16} />
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <MvpPanel title="Total Male MVP" rows={maleMvpRows.slice(0, 8)} />
          <MvpPanel title="Total Female MVP" rows={femaleMvpRows.slice(0, 8)} />
        </aside>
      </section>
    </main>
  );
}

function formatMvpLeader(row?: { playerName: string; votes: number }) {
  if (!row) {
    return "TBC";
  }

  return `${row.playerName} (${row.votes})`;
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-slate-500" />
      <div>
        <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
        <p className="text-sm font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function MvpPanel({
  rows,
  title,
}: {
  rows: Array<{ playerName: string; teamName: string; votes: number }>;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <ol className="mt-4 space-y-2">
        {rows.map((row, index) => (
          <li key={`${row.teamName}-${row.playerName}`} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-3">
            <span className="grid size-7 shrink-0 place-items-center rounded bg-white text-xs font-black text-slate-700">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-slate-950">{row.playerName}</span>
              <span className="block truncate text-xs font-medium text-slate-500">{row.teamName}</span>
            </span>
            <span className="rounded bg-slate-950 px-2 py-1 text-xs font-black text-white">{row.votes}</span>
          </li>
        ))}
      </ol>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-600">
          No votes yet.
        </p>
      ) : null}
    </section>
  );
}
