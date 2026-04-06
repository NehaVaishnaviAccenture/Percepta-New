export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-xl font-semibold tracking-tight">Percepta</div>
          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <a href="#">Overview</a>
            <a href="#">Insights</a>
            <a href="#">Maps</a>
            <a href="#">Contact</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Filters
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Region
              </label>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500">
                Select region
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Time Range
              </label>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500">
                Last 30 days
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Layer
              </label>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500">
                Population density
              </div>
            </div>

            <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
              Apply Filters
            </button>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Geospatial Intelligence
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              Explore location data with a cleaner, faster Percepta experience.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-600">
              Analyze regions, compare signals, and turn spatial data into
              actionable insights through a modern geospatial interface.
            </p>

            <div className="mt-6 flex gap-3">
              <button className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white">
                Request Demo
              </button>
              <button className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-900">
                Learn More
              </button>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Coverage</p>
              <h3 className="mt-2 text-3xl font-bold">128</h3>
              <p className="mt-1 text-sm text-slate-600">Mapped regions</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Signals</p>
              <h3 className="mt-2 text-3xl font-bold">42K</h3>
              <p className="mt-1 text-sm text-slate-600">Location records</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Accuracy</p>
              <h3 className="mt-2 text-3xl font-bold">94%</h3>
              <p className="mt-1 text-sm text-slate-600">Validated insight match</p>
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
            <div className="flex h-[420px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#dbeafe,#e2e8f0,#f8fafc)] text-center">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  Map Area
                </p>
                <h3 className="mt-3 text-2xl font-semibold">
                  Your map or geospatial visualization goes here
                </h3>
                <p className="mt-2 text-slate-600">
                  We can replace this with your real layout next.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}