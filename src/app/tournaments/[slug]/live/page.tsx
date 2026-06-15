import { CalendarDays, MapPin, RefreshCw, Trophy } from "lucide-react";

import { AutoRefresh } from "@/components/tournaments/auto-refresh";
import { StandingsTable } from "@/components/tournaments/standings-table";
import { ndscColours, ndscHeroGradient } from "@/lib/ndsc-theme";
import { getTournamentBundle } from "@/lib/tournaments/data";
import { formatDate, formatTime } from "@/lib/tournaments/format";
import { isFixtureComplete, teamName } from "@/lib/tournaments/view-model";

export const dynamic = "force-dynamic";

export default async function TournamentLivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { fixtures, standings, teams, tournament } = await getTournamentBundle(slug);
  const nextFixtures = fixtures.filter((fixture) => !isFixtureComplete(fixture)).slice(0, 4);
  const latestResults = fixtures
    .filter(isFixtureComplete)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    .slice(0, 4);
  const leader = standings[0];

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <AutoRefresh enabled={tournament.status !== "complete"} intervalMs={8000} />
      <section className="mx-auto grid max-w-7xl gap-6">
        <header className="rounded-lg p-5 sm:p-6" style={{ background: ndscHeroGradient() }}>
          <div className="grid gap-5 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: ndscColours.mint }}>NDSC live board</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">{tournament.name}</h1>
              <div className="mt-5 grid gap-2 text-sm font-bold text-white/90 sm:grid-cols-2">
                <span className="inline-flex items-center gap-2 rounded-md bg-white/12 px-3 py-2">
                  <CalendarDays size={18} /> {formatDate(tournament.date)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-md bg-white/12 px-3 py-2">
                  <MapPin size={18} /> {tournament.venue}
                </span>
              </div>
            </div>
            <div className="grid gap-3 rounded-md bg-white/12 p-4">
              <div className="flex items-center gap-3">
                <RefreshCw size={20} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">Auto refresh</p>
                  <p className="text-lg font-black">{tournament.status === "complete" ? "Tournament complete" : "Every 8 seconds"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Trophy size={20} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">Leader</p>
                  <p className="text-lg font-black">{leader?.teamName ?? "TBC"}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-lg bg-white p-4 text-slate-950 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Up next</p>
                <h2 className="text-3xl font-black">Next Games</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                {nextFixtures.length}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {nextFixtures.map((fixture) => (
                <div key={fixture.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-4xl font-black text-slate-950">{formatTime(fixture.startsAt)}</p>
                    <p className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase text-white">{fixture.pitch}</p>
                  </div>
                  <p className="mt-4 text-2xl font-black leading-tight sm:text-3xl">
                    {teamName(teams, fixture.homeTeamId)} <span className="text-slate-400">vs</span> {teamName(teams, fixture.awayTeamId)}
                  </p>
                  {fixture.umpires && fixture.umpires.length > 0 ? (
                    <p className="mt-2 text-sm font-semibold text-slate-600">Umpires: {fixture.umpires.map((umpire) => umpire.name).join(", ")}</p>
                  ) : null}
                </div>
              ))}
              {nextFixtures.length === 0 ? <p className="text-lg font-bold text-slate-600">All games complete.</p> : null}
            </div>
          </section>
          <section className="rounded-lg bg-white p-4 text-slate-950 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Table</p>
            <h2 className="text-3xl font-black">Standings</h2>
            <div className="mt-4">
              <StandingsTable rows={standings} compact />
            </div>
          </section>
        </div>
        <section className="rounded-lg bg-white p-4 text-slate-950 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Completed</p>
              <h2 className="text-3xl font-black">Latest Results</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
              {latestResults.length}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {latestResults.map((fixture) => (
              <div key={fixture.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold uppercase text-slate-500">{formatTime(fixture.startsAt)}</p>
                  <p className="text-xs font-bold uppercase text-slate-500">{fixture.pitch}</p>
                </div>
                <p className="mt-2 text-2xl font-black">
                  {teamName(teams, fixture.homeTeamId)} <span className="rounded bg-slate-950 px-2 py-1 text-white">{fixture.homeRuns}-{fixture.awayRuns}</span> {teamName(teams, fixture.awayTeamId)}
                </p>
              </div>
            ))}
            {latestResults.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-lg font-bold text-slate-600">
                Results will appear once scores are saved.
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
