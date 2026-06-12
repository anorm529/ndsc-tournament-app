import { formatTime } from "@/lib/tournaments/format";
import { Fixture, MvpVote, Team } from "@/lib/tournaments/types";
import { isFixtureComplete, teamName, teamShortName } from "@/lib/tournaments/view-model";

export function FixtureCard({
  fixture,
  mvpVotes = [],
  mvpMode = "overall",
  teams,
  mode = "public",
}: {
  fixture: Fixture;
  mvpVotes?: MvpVote[];
  mvpMode?: "overall" | "gendered";
  teams: Team[];
  mode?: "public" | "admin";
}) {
  const complete = isFixtureComplete(fixture);
  const homeName = teamName(teams, fixture.homeTeamId);
  const awayName = teamName(teams, fixture.awayTeamId);
  const homeShortName = teamShortName(teams, fixture.homeTeamId);
  const awayShortName = teamShortName(teams, fixture.awayTeamId);
  const getMvp = (teamId: string, category: MvpVote["category"]) =>
    mvpVotes.find(
      (vote) => vote.fixtureId === fixture.id && vote.teamId === teamId && vote.category === category,
    );
  const stageLabel = getFixtureStageLabel(fixture.stage);

  if (mode === "admin") {
    return (
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <input name="fixtureId" type="hidden" value={fixture.id} />
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-950">{formatTime(fixture.startsAt)}</p>
            <p className="text-xs font-semibold uppercase text-slate-500">
              {stageLabel} - {fixture.pitch}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
              complete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {complete ? "Saved" : "Open"}
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          <ScoreRow
            label="Home"
            name={homeName}
            shortName={homeShortName}
            inputName={`homeRuns-${fixture.id}`}
            mvpMode={mvpMode}
            mvpNames={{
              female: getMvp(fixture.homeTeamId, "female")?.playerName,
              male: getMvp(fixture.homeTeamId, "male")?.playerName,
              overall: getMvp(fixture.homeTeamId, "overall")?.playerName,
            }}
            mvpPrefix={`homeMvp-${fixture.id}`}
            score={fixture.homeRuns}
          />
          <ScoreRow
            label="Away"
            name={awayName}
            shortName={awayShortName}
            inputName={`awayRuns-${fixture.id}`}
            mvpMode={mvpMode}
            mvpNames={{
              female: getMvp(fixture.awayTeamId, "female")?.playerName,
              male: getMvp(fixture.awayTeamId, "male")?.playerName,
              overall: getMvp(fixture.awayTeamId, "overall")?.playerName,
            }}
            mvpPrefix={`awayMvp-${fixture.id}`}
            score={fixture.awayRuns}
          />
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase text-slate-500">
        <span>{formatTime(fixture.startsAt)}</span>
        <span>{stageLabel} - {fixture.pitch}</span>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamBlock align="right" name={homeName} shortName={homeShortName} />
        <div className="min-w-16 rounded bg-slate-950 px-3 py-2 text-center text-sm font-bold text-white">
          {complete ? `${fixture.homeRuns}-${fixture.awayRuns}` : "vs"}
        </div>
        <TeamBlock name={awayName} shortName={awayShortName} />
      </div>
    </article>
  );
}

function getFixtureStageLabel(stage: Fixture["stage"]) {
  const labels: Record<Fixture["stage"], string> = {
    "fifth-place": "5th place",
    final: "Final",
    group: "Group",
    "semi-final": "Semi-final",
    "third-place": "3rd place",
  };

  return labels[stage];
}

function ScoreRow({
  inputName,
  label,
  mvpMode,
  mvpNames,
  mvpPrefix,
  name,
  score,
  shortName,
}: {
  inputName: string;
  label: string;
  mvpMode: "overall" | "gendered";
  mvpNames: Partial<Record<MvpVote["category"], string>>;
  mvpPrefix: string;
  name: string;
  score?: number;
  shortName: string;
}) {
  return (
    <div className="grid gap-3 px-4 py-3">
      <div className="grid grid-cols-[1fr_88px] items-center gap-3">
        <label className="min-w-0">
          <span className="block text-[11px] font-bold uppercase text-slate-500">{label}</span>
          <span className="mt-1 flex min-w-0 items-center gap-2">
            <span className="inline-flex h-7 min-w-10 items-center justify-center rounded bg-slate-100 px-2 text-xs font-bold text-slate-700">
              {shortName}
            </span>
            <span className="truncate text-base font-bold text-slate-950">{name}</span>
          </span>
        </label>
        <input
          aria-label={`${name} score`}
          className="h-14 w-full rounded-md border border-slate-300 bg-white px-2 text-center text-2xl font-black text-slate-950 shadow-inner outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          defaultValue={score}
          enterKeyHint="next"
          inputMode="numeric"
          min={0}
          name={inputName}
          placeholder="0"
          type="number"
        />
      </div>
      {mvpMode === "gendered" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <MvpInput label="Male MVP" name={`${mvpPrefix}-male`} playerName={mvpNames.male} teamName={name} />
          <MvpInput label="Female MVP" name={`${mvpPrefix}-female`} playerName={mvpNames.female} teamName={name} />
        </div>
      ) : (
        <MvpInput label="Team MVP" name={`${mvpPrefix}-overall`} playerName={mvpNames.overall} teamName={name} />
      )}
    </div>
  );
}

function MvpInput({
  label,
  name,
  playerName,
  teamName,
}: {
  label: string;
  name: string;
  playerName?: string;
  teamName: string;
}) {
  return (
    <label>
      <span className="text-[11px] font-bold uppercase text-slate-500">{label}</span>
      <input
        aria-label={`${teamName} ${label}`}
        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        defaultValue={playerName}
        maxLength={80}
        name={name}
        placeholder="Player name"
        type="text"
      />
    </label>
  );
}

function TeamBlock({
  align = "left",
  name,
  shortName,
}: {
  align?: "left" | "right";
  name: string;
  shortName: string;
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-xs font-semibold text-slate-500 sm:hidden">{shortName}</p>
      <p className="hidden text-sm font-bold text-slate-950 sm:block">{name}</p>
      <p className="text-sm font-bold text-slate-950 sm:hidden">{shortName}</p>
    </div>
  );
}
