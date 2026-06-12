import { Award } from "lucide-react";

import { MvpLeader } from "@/lib/tournaments/types";

export function MvpLeaderboard({
  leaders,
  limit,
}: {
  leaders: MvpLeader[];
  limit?: number;
}) {
  const visibleLeaders = limit ? leaders.slice(0, limit) : leaders;

  if (visibleLeaders.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-600">
        MVP votes will appear here once entered with results.
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {visibleLeaders.map((leader, index) => (
        <li
          key={`${leader.teamId}-${leader.playerName}`}
          className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded bg-amber-100 text-sm font-black text-amber-800">
            {index === 0 ? <Award size={16} /> : index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-950">{leader.playerName}</span>
            <span className="block truncate text-xs font-medium text-slate-500">
              {leader.teamName}
              {leader.category !== "overall" ? ` - ${leader.category}` : ""}
            </span>
          </span>
          <span className="rounded bg-slate-100 px-2 py-1 text-sm font-black text-slate-800">
            {leader.votes}
          </span>
        </li>
      ))}
    </ol>
  );
}
