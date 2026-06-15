import { getTournamentBundle } from "@/lib/tournaments/data";
import { formatDate, formatTime } from "@/lib/tournaments/format";
import { isFixtureComplete, teamName } from "@/lib/tournaments/view-model";

export const dynamic = "force-dynamic";

export default async function TournamentPrintPackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { fixtures, standings, teams, tournament } = await getTournamentBundle(slug);

  return (
    <main className="bg-white p-8 text-slate-950 print:p-0">
      <style>{`
        @media print {
          nav, button { display: none !important; }
          section { break-inside: avoid; }
          body { background: white; }
        }
      `}</style>
      <nav className="mb-6 flex items-center justify-between">
        <a className="text-sm font-bold text-slate-600" href={`/admin/tournaments/${tournament.slug}/exports`}>
          Back to exports
        </a>
        <p className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">Print or save as PDF from your browser</p>
      </nav>
      <header className="border-b-4 border-slate-950 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">North Down Softball Club</p>
        <h1 className="mt-2 text-4xl font-black">{tournament.name}</h1>
        <p className="mt-2 text-base font-semibold text-slate-600">
          {formatDate(tournament.date)} - {tournament.venue}
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-xl font-black">Teams</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {teams.map((team) => (
            <div key={team.id} className="border border-slate-300 p-3">
              <p className="font-bold">{team.name}</p>
              <p className="text-sm text-slate-600">{team.contactName ?? "Captain TBC"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Schedule and Score Sheet</h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              <PrintTh>Time</PrintTh>
              <PrintTh>Diamond</PrintTh>
              <PrintTh>Stage</PrintTh>
              <PrintTh>Home</PrintTh>
              <PrintTh>Score</PrintTh>
              <PrintTh>Away</PrintTh>
              <PrintTh>MVPs</PrintTh>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((fixture) => (
              <tr key={fixture.id}>
                <PrintTd>{formatTime(fixture.startsAt)}</PrintTd>
                <PrintTd>{fixture.pitch}</PrintTd>
                <PrintTd>{fixture.stage}</PrintTd>
                <PrintTd>{teamName(teams, fixture.homeTeamId)}</PrintTd>
                <PrintTd>{isFixtureComplete(fixture) ? `${fixture.homeRuns}-${fixture.awayRuns}` : ""}</PrintTd>
                <PrintTd>{teamName(teams, fixture.awayTeamId)}</PrintTd>
                <PrintTd />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Standings</h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              <PrintTh>Team</PrintTh>
              <PrintTh>P</PrintTh>
              <PrintTh>W</PrintTh>
              <PrintTh>D</PrintTh>
              <PrintTh>L</PrintTh>
              <PrintTh>RF</PrintTh>
              <PrintTh>RA</PrintTh>
              <PrintTh>RD</PrintTh>
              <PrintTh>Pts</PrintTh>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.teamId}>
                <PrintTd>{row.teamName}</PrintTd>
                <PrintTd>{row.played}</PrintTd>
                <PrintTd>{row.wins}</PrintTd>
                <PrintTd>{row.draws}</PrintTd>
                <PrintTd>{row.losses}</PrintTd>
                <PrintTd>{row.runsFor}</PrintTd>
                <PrintTd>{row.runsAgainst}</PrintTd>
                <PrintTd>{row.runDifference}</PrintTd>
                <PrintTd>{row.points}</PrintTd>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function PrintTh({ children }: { children: React.ReactNode }) {
  return <th className="border border-slate-400 bg-slate-100 p-2 text-left font-black">{children}</th>;
}

function PrintTd({ children }: { children?: React.ReactNode }) {
  return <td className="h-10 border border-slate-300 p-2 align-top">{children}</td>;
}
