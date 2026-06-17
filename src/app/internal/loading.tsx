export default function Loading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <section className="border-b border-slate-800" style={{ backgroundColor: "#0b1222" }}>
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-10">
          <div className="h-4 w-36 animate-pulse rounded bg-white/20" />
          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <div className="h-3.5 w-40 animate-pulse rounded bg-white/20" />
              <div className="mt-3 h-12 w-56 animate-pulse rounded bg-white/20" />
              <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded bg-white/10" />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="mb-3 h-8 animate-pulse rounded bg-white/20 last:mb-0" />
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
            <div className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
          </div>
        </div>
        <aside className="space-y-5">
          <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
          <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
        </aside>
      </section>
    </main>
  );
}
