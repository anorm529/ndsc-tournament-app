export default function Loading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <section className="border-b border-slate-800" style={{ backgroundColor: "#0b1222" }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-10">
          <div className="max-w-3xl">
            <div className="h-3.5 w-48 animate-pulse rounded bg-white/20" />
            <div className="mt-4 h-11 w-72 animate-pulse rounded bg-white/20" />
            <div className="mt-4 h-6 w-96 max-w-full animate-pulse rounded bg-white/10" />
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-32 animate-pulse rounded-md bg-white/20" />
            <div className="h-11 w-28 animate-pulse rounded-md bg-white/20" />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <div className="mb-8 h-36 animate-pulse rounded-lg border border-slate-200 bg-white p-5 shadow-sm" />
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
          ))}
        </div>
      </section>
    </main>
  );
}
