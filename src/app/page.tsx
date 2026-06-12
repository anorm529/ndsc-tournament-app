import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  LockKeyhole,
  MapPin,
  Shield,
  Star,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { getTournamentCards } from "@/lib/tournaments/data";
import { formatDate } from "@/lib/tournaments/format";
import { TournamentCard } from "@/lib/tournaments/types";

export const dynamic = "force-dynamic";

const statusStyles: Record<TournamentCard["status"], string> = {
  complete: "bg-slate-200 text-slate-700",
  draft: "bg-amber-100 text-amber-800",
  live: "bg-emerald-100 text-emerald-800",
  published: "bg-rose-100 text-rose-800",
};

const statusLabels: Record<TournamentCard["status"], string> = {
  complete: "Complete",
  draft: "Draft",
  live: "Live",
  published: "Published",
};

export default async function Home() {
  const allTournaments = await getTournamentCards();
  const tournaments = allTournaments.filter((tournament) => tournament.tournamentType === "public");
  const internalCount = allTournaments.filter((tournament) => tournament.tournamentType === "internal").length;
  const featuredTournament = tournaments[0];
  const remainingTournaments = featuredTournament
    ? tournaments.filter((tournament) => tournament.id !== featuredTournament.id)
    : tournaments;

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">
              North Down Softball Club
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Club Tournaments
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Schedules, results, standings, brackets, and MVP leaders for NDSC tournament days.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/internal"
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <Star size={16} /> Internal league
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <LockKeyhole size={16} /> Admin
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        {featuredTournament ? (
          <section className="mb-8 rounded-lg border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">
                  {featuredTournament.priority === "live" ? "Live now" : "Next tournament"}
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  {featuredTournament.name}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  {formatDate(featuredTournament.date)} at {featuredTournament.venue}
                </p>
                <div className="mt-5 grid max-w-2xl grid-cols-3 gap-2">
                  <FeaturedStat icon={Users} label="Teams" value={`${featuredTournament.teamsCount}`} />
                  <FeaturedStat
                    icon={ClipboardList}
                    label="Games"
                    value={`${featuredTournament.playedFixturesCount}/${featuredTournament.fixturesCount}`}
                  />
                  <FeaturedStat icon={Trophy} label="Pitches" value={`${featuredTournament.pitches.length}`} />
                </div>
              </div>
              <Link
                href={`/tournaments/${featuredTournament.slug}`}
                className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-rose-700 px-5 text-sm font-bold text-white transition hover:bg-rose-800"
              >
                View tournament <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        ) : null}

        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-950">All tournaments</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upcoming events and the tournament archive.
            </p>
          </div>
          <span className="text-sm font-bold text-slate-500">
            {tournaments.length} public, {internalCount} internal
          </span>
        </div>

        {remainingTournaments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {remainingTournaments.map((tournament) => (
              <TournamentTile key={tournament.id} tournament={tournament} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm font-medium text-slate-600">
            No other tournaments yet.
          </div>
        )}
      </section>
    </main>
  );
}

function TournamentTile({ tournament }: { tournament: TournamentCard }) {
  return (
    <Link
      href={`/tournaments/${tournament.slug}`}
      className="group flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusStyles[tournament.status]}`}>
          {statusLabels[tournament.status]}
        </span>
        <span className="text-xs font-bold uppercase text-slate-400">
          {tournament.priority === "past" ? "Archive" : tournament.priority}
        </span>
      </div>

      <div className="mt-4 flex-1">
        <h2 className="text-xl font-black tracking-tight text-slate-950">{tournament.name}</h2>
        <div className="mt-3 space-y-2 text-sm font-medium text-slate-600">
          <InfoLine icon={CalendarDays} text={formatDate(tournament.date)} />
          <InfoLine icon={MapPin} text={tournament.venue} />
          <InfoLine icon={Shield} text={tournament.format.replaceAll("-", " ")} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
        <MiniStat icon={Users} label="Teams" value={`${tournament.teamsCount}`} />
        <MiniStat icon={ClipboardList} label="Games" value={`${tournament.playedFixturesCount}/${tournament.fixturesCount}`} />
        <MiniStat icon={Trophy} label="Pitches" value={`${tournament.pitches.length}`} />
      </div>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-rose-700 transition group-hover:text-rose-900">
        Open tournament <ArrowRight size={16} />
      </span>
    </Link>
  );
}

function InfoLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <p className="flex items-center gap-2">
      <Icon size={16} className="shrink-0 text-slate-400" />
      <span>{text}</span>
    </p>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon size={14} />
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function FeaturedStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon size={15} />
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
