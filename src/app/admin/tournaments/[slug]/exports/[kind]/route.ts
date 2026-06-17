import { getTournamentBundle } from "@/lib/tournaments/data";
import { prisma } from "@/lib/db";
import { teamName } from "@/lib/tournaments/view-model";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; kind: string }> },
) {
  const { kind, slug } = await params;
  const bundle = await getTournamentBundle(slug);
  const rows = kind === "audit" ? await getAuditRows(bundle.tournament.id) : getRows(kind, bundle);
  const csv = toCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${bundle.tournament.slug}-${kind}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

function getRows(kind: string, bundle: Awaited<ReturnType<typeof getTournamentBundle>>) {
  if (kind === "fixtures") {
    return bundle.fixtures.map((fixture) => ({
      time: fixture.startsAt,
      pitch: fixture.pitch,
      stage: fixture.stage,
      home: teamName(bundle.teams, fixture.homeTeamId),
      away: teamName(bundle.teams, fixture.awayTeamId),
      homeRuns: fixture.homeRuns ?? "",
      awayRuns: fixture.awayRuns ?? "",
      umpires: fixture.umpires?.map((umpire) => umpire.name).join("; ") ?? "",
    }));
  }

  if (kind === "standings") {
    return bundle.standings.map((row, index) => ({
      position: index + 1,
      team: row.teamName,
      played: row.played,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      runsFor: row.runsFor,
      runsAgainst: row.runsAgainst,
      runDifference: row.runDifference,
      points: row.points,
    }));
  }

  if (kind === "mvp") {
    return bundle.mvpVotes.map((vote) => ({
      player: vote.playerName,
      team: teamName(bundle.teams, vote.teamId),
      category: vote.category,
      fixtureId: vote.fixtureId,
    }));
  }

  if (kind === "teams") {
    return bundle.teams.map((team) => ({
      name: team.name,
      shortName: team.shortName,
      captain: team.contactName ?? "",
      email: team.contactEmail ?? "",
      checkedInAt: team.checkedInAt ?? "",
    }));
  }

  return bundle.mvpLeaders.map((leader) => ({
    player: leader.playerName,
    team: leader.teamNames.join(", "),
    category: leader.category,
    votes: leader.votes,
  }));
}

async function getAuditRows(tournamentId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "desc" },
  });

  return logs.map((log) => ({
    createdAt: log.createdAt.toISOString(),
    entityType: log.entityType,
    entityId: log.entityId ?? "",
    action: log.action,
    actorName: log.actorName ?? "",
    actorEmail: log.actorEmail ?? "",
    actorRole: log.actorRole ?? "",
    summary: log.summary,
  }));
}

function toCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\n");
}

function escapeCell(value: string | number) {
  const text = String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
