import { Award } from "lucide-react";

import { MvpLeader } from "@/lib/tournaments/types";

export function MvpLeaderboard({
  leaders,
  limit,
}: {
  leaders: MvpLeader[];
  limit?: number;
}) {
  if (leaders.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-600">
        MVP votes will appear here once entered with results.
      </div>
    );
  }

  const categories = [...new Set(leaders.map((l) => l.category))];
  const isMultiCategory = categories.length > 1;

  return (
    <div className={isMultiCategory ? "space-y-5" : ""}>
      {categories.map((category) => {
        const catLeaders = leaders.filter((l) => l.category === category);
        const visibleLeaders = limit ? catLeaders.slice(0, limit) : catLeaders;

        const rankOf = (votes: number) =>
          catLeaders.findIndex((l) => l.votes === votes) + 1;

        const categoryLabel =
          category === "male" ? "Male MVP" : category === "female" ? "Female MVP" : "MVP";

        return (
          <div key={category}>
            {isMultiCategory && (
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                {categoryLabel}
              </p>
            )}
            <ol className="space-y-2">
              {visibleLeaders.map((leader) => {
                const rank = rankOf(leader.votes);
                return (
                  <li
                    key={`${leader.category}-${leader.playerName}`}
                    className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded bg-amber-100 text-sm font-black text-amber-800">
                      {rank === 1 ? <Award size={16} /> : rank}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-950">
                        {leader.playerName}
                      </span>
                      <span className="block truncate text-xs font-medium text-slate-500">
                        {leader.teamNames.join(", ")}
                      </span>
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-sm font-black text-slate-800">
                      {leader.votes}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
