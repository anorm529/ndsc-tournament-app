import { Standing } from "@/lib/tournaments/types";

export function StandingsTable({ rows, compact = false }: { rows: Standing[]; compact?: boolean }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="py-3 pr-4">Team</th>
            <th className="px-3 py-3 text-center">P</th>
            <th className="px-3 py-3 text-center">W</th>
            <th className="px-3 py-3 text-center">D</th>
            <th className="px-3 py-3 text-center">L</th>
            {!compact && <th className="px-3 py-3 text-center">RF</th>}
            {!compact && <th className="px-3 py-3 text-center">RA</th>}
            <th className="px-3 py-3 text-center">RD</th>
            <th className="py-3 pl-3 text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.teamId} className="border-b border-slate-100 last:border-0">
              <td className="py-3 pr-4 font-semibold text-slate-950">
                <span className="mr-3 inline-flex size-6 items-center justify-center rounded bg-slate-100 text-xs text-slate-600">
                  {index + 1}
                </span>
                {row.teamName}
              </td>
              <td className="px-3 py-3 text-center">{row.played}</td>
              <td className="px-3 py-3 text-center">{row.wins}</td>
              <td className="px-3 py-3 text-center">{row.draws}</td>
              <td className="px-3 py-3 text-center">{row.losses}</td>
              {!compact && <td className="px-3 py-3 text-center">{row.runsFor}</td>}
              {!compact && <td className="px-3 py-3 text-center">{row.runsAgainst}</td>}
              <td className="px-3 py-3 text-center">{row.runDifference}</td>
              <td className="py-3 pl-3 text-right font-bold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
