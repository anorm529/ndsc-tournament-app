import Link from "next/link";
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";

import { ndscColours } from "@/lib/ndsc-theme";
import { getTournamentCards } from "@/lib/tournaments/data";
import { formatDate } from "@/lib/tournaments/format";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const tournaments = (await getTournamentCards()).filter((event) => event.status === "complete");

  return (
    <main className="min-h-screen" style={{ backgroundColor: ndscColours.page }}>
      <section className="border-b border-slate-800 text-white" style={{ backgroundColor: ndscColours.navy }}>
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
            <ArrowLeft size={16} /> Club tournaments
          </Link>
          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: ndscColours.mint }}>NDSC history</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Tournament Archive</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Completed tournament pages, results, standings, and MVP records.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((event) => (
            <Link
              key={event.id}
              href={`/tournaments/${event.slug}`}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">
                  <Trophy size={14} /> Complete
                </span>
                <span className="text-xs font-bold uppercase text-slate-400">{event.tournamentType}</span>
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-950">{event.name}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">{formatDate(event.date)} at {event.venue}</p>
              <p className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700 group-hover:text-teal-900">
                Open record <ArrowRight size={16} />
              </p>
            </Link>
          ))}
        </div>
        {tournaments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm font-medium text-slate-600">
            Completed tournaments will appear here.
          </p>
        ) : null}
      </section>
    </main>
  );
}
