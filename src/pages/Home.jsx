import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { useAuth } from '../context/useAuth.js';

const routeCards = [
  {
    id: 'campus-ononto-sohor-campus',
    name: 'Campus - Ononto - Sohor - Campus',
    schedule: '7.00 p.m. - 8.00 p.m. / 8.15 p.m. - 9.00 p.m.',
    status: 'On schedule',
    next: 'Next departure: 07:30 AM',
  },
  {
    id: 'campus-meril-sohor-campus',
    name: 'Campus - Meril - Sohor - Campus',
    schedule: '7.00 p.m. - 8.00 p.m. / 8.15 p.m. - 9.00 p.m.',
    status: 'On schedule',
    next: 'Next departure: 08:00 AM',
  },
];

export default function Home({ darkMode, setDarkMode }) {
  const [query, setQuery] = useState('');
  const { user, logout } = useAuth();

  const filteredRoutes = useMemo(() => {
    if (!query.trim()) return routeCards;
    const q = query.toLowerCase();
    return routeCards.filter((route) => route.name.toLowerCase().includes(q));
  }, [query]);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[#edf4ef] text-[#122218] transition-colors duration-200 dark:bg-[#07110f] dark:text-[#edf7f2]">
        <div className="mx-auto flex max-w-[1700px]">
          <Sidebar />

          <main className="min-h-screen flex-1">
            <header className="flex items-center justify-between border-b border-[#dfeae4] bg-white/90 px-4 py-5 backdrop-blur-sm md:px-8 dark:border-[#16332d] dark:bg-[#0d1715]/90">
              <div>
                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#557066] dark:text-[#9fe0be]">
                  <span>Home</span>
                  <span className="inline-block h-1 w-1 rounded-full bg-[#0b5d3b]" />
                  <span>Track by route</span>
                </div>
                <h1 className="mt-2 text-2xl font-semibold text-[#101f18] dark:text-white">
                  university bus tracking
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-xl border border-[#dfeae4] bg-[#f7faf8] px-3 py-2 text-sm text-[#49635b] shadow-sm md:flex dark:border-[#16332d] dark:bg-[#102620] dark:text-[#dff4e8]">
                  📅 {todayLabel}
                </div>
                <button
                  type="button"
                  aria-label="Toggle theme"
                  onClick={() => setDarkMode(!darkMode)}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-[#dfeae4] bg-white text-lg text-[#123528] shadow-sm transition hover:bg-[#eff7f0] dark:border-[#16332d] dark:bg-[#102620] dark:text-[#dff4e8]"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                {user ? (
                  <div className="flex items-center gap-3">
                    <span className="hidden text-sm font-semibold text-[#123528] sm:inline dark:text-[#dff4e8]">
                      {user.name}
                    </span>
                    <button
                      type="button"
                      onClick={logout}
                      className="rounded-xl border border-[#dfeae4] bg-white px-4 py-2 text-sm font-semibold text-[#123528] transition hover:bg-[#eff7f0] dark:border-[#16332d] dark:bg-[#102620] dark:text-[#dff4e8]"
                    >
                      Log out
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="rounded-xl bg-[#0b5d3b] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(11,93,59,0.18)] transition hover:bg-[#084a2f]"
                  >
                    Student login
                  </Link>
                )}
              </div>
            </header>

            <div className="px-4 py-6 md:px-8 md:py-8">
              <section className="overflow-hidden rounded-[28px] border border-[#0b5d3b]/10 bg-gradient-to-br from-[#0b5d3b] via-[#0d7a4d] to-[#071d18] px-6 py-7 text-white shadow-[0_20px_40px_rgba(11,93,59,0.18)] md:px-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-[720px]">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                      <span className="h-2 w-2 rounded-full bg-[#5ef0a2]" />
                      Live university bus transport
                    </div>
                    <h2 className="text-3xl font-semibold leading-tight md:text-5xl">PUST Bus Tracker</h2>
                    <p className="mt-4 max-w-xl text-base text-emerald-50/90">
                      Monitor the university bus routes in real time. Access is restricted to verified students with an official PUST institutional email account.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {user ? (
                      <Link
                        to="/routes"
                        className="rounded-xl bg-[#a7f3d0] px-4 py-2.5 text-sm font-semibold text-[#064e3b] shadow-sm transition hover:bg-[#6ee7b7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        Track buses
                      </Link>
                    ) : (
                      <Link
                        to="/login"
                        className="rounded-xl bg-[#a7f3d0] px-4 py-2.5 text-sm font-semibold text-[#064e3b] shadow-sm transition hover:bg-[#6ee7b7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        Register now
                      </Link>
                    )}
                    <Link to="/routes" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm">
                      View routes
                    </Link>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-100/80">Routes</div>
                    <div className="mt-2 text-2xl font-semibold">2</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-100/80">Access</div>
                    <div className="mt-2 text-2xl font-semibold">Verified</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-100/80">Status</div>
                    <div className="mt-2 text-2xl font-semibold">Live</div>
                  </div>
                </div>
              </section>

              <section className="mt-7 rounded-[24px] border border-[#dfeae4] bg-white p-4 shadow-sm md:p-5 dark:border-[#16332d] dark:bg-[#0d1715]">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#557066] dark:text-[#9fe0be]">Track by route</p>
                    <h3 className="mt-2 text-xl font-semibold text-[#122218] dark:text-white">Available university bus routes</h3>
                  </div>
                  <div className="flex-1 max-w-md">
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search route name"
                      className="w-full rounded-xl border border-[#dfeae4] bg-[#f7faf8] px-4 py-3 text-sm text-[#123528] outline-none transition placeholder:text-[#6d7d77] focus:border-[#0b5d3b] focus:ring-2 focus:ring-[#c8ead7] dark:border-[#16332d] dark:bg-[#0f1d1a] dark:text-[#edf7f2] dark:placeholder:text-[#9bb6ae]"
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {filteredRoutes.map((route) => (
                    <article key={route.id} className="rounded-[22px] border border-[#dfeae4] bg-[#f9fbf9] p-5 shadow-[0_10px_24px_rgba(18,36,29,0.02)] dark:border-[#16332d] dark:bg-[#0d1a18]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6a7d75] dark:text-[#9bb6ae]">Route</p>
                          <h4 className="mt-2 text-xl font-semibold text-[#133327] dark:text-white">{route.name}</h4>
                        </div>
                        <span className="rounded-full bg-[#e7f3ea] px-2.5 py-1 text-xs font-semibold text-[#0b5d3b] dark:bg-[#102922] dark:text-[#9fe0be]">
                          {route.status}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl border border-[#dfeae4] bg-white p-3 text-sm text-[#45615a] dark:border-[#18342d] dark:bg-[#112925] dark:text-[#dff4e8]">
                        <div className="flex items-center justify-between gap-3">
                          <span>Schedule</span>
                          <span className="font-medium text-[#0d5c3b] dark:text-[#9fe0be]">{route.schedule}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span>Next departure</span>
                          <span className="font-medium text-[#0d5c3b] dark:text-[#9fe0be]">{route.next}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-sm text-[#506a63] dark:text-[#cfe6dc]">Verified students only</span>
                        <Link
                          to="/routes"
                          className="rounded-xl bg-[#0b5d3b] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(11,93,59,0.15)] hover:bg-[#084a2f]"
                        >
                          Track route
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>

                {filteredRoutes.length === 0 && (
                  <p className="mt-4 text-sm text-[#5f726a] dark:text-[#cfe6dc]">No route matches your search.</p>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
