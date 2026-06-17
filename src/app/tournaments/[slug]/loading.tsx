export default function Loading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <section className="border-b border-slate-800" style={{ backgroundColor: "#0b1222" }}>
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-10">
          <div className="h-4 w-36 animate-pulse rounded bg-white/20" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <div className="h-10 w-80 animate-pulse rounded bg-white/20" />
              <div className="mt-3 h-5 w-56 animate-pulse rounded bg-white/10" />
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="h-10 w-28 animate-pulse rounded-lg bg-white/20" />
                <div className="h-10 w-28 animate-pulse rounded-lg bg-white/20" />
                <div className="h-10 w-28 animate-pulse rounded-lg bg-white/20" />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="mb-3 h-10 animate-pulse rounded-lg bg-white/20 last:mb-0" />
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-6 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="space-y-4">
          <div className="h-12 w-64 animate-pulse rounded bg-slate-200" />
          <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
        </div>
        <aside className="mt-4 space-y-4 lg:mt-0">
          <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
        </aside>
      </section>
    </main>
  );
}
