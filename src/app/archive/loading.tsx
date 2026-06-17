export default function Loading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <section className="border-b border-slate-800" style={{ backgroundColor: "#0b1222" }}>
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-10">
          <div className="h-4 w-36 animate-pulse rounded bg-white/20" />
          <div className="mt-7 h-12 w-72 animate-pulse rounded bg-white/20" />
          <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded bg-white/10" />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
          ))}
        </div>
      </section>
    </main>
  );
}
