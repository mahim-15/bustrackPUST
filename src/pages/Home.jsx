
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/useAuth.js';
import { getBusScheduleStatus, sortRoutesBySchedule } from '../utils/busSchedule.js';

function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Home() {
  const { user } = useAuth();

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [registeredCount, setRegisteredCount] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Fetch bus routes
  useEffect(() => {
    let cancelled = false;

    api.getRoutes()
      .then((result) => {
        if (!cancelled) setRoutes(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch total registered users (distinct email addresses)
  useEffect(() => {
    let cancelled = false;

    api.getRegisteredStudentCount()
      .then((data) => {
        if (!cancelled) {
          setRegisteredCount(data.total);
        }
      })
      .catch((err) => {
        console.error('Could not load registered user count:', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matchingRoutes = !q ? routes : routes.filter(
      (route) =>
        route.name.toLowerCase().includes(q) ||
        (route.description || '').toLowerCase().includes(q)
    );
    return sortRoutesBySchedule(matchingRoutes, new Date(currentTime));
  }, [routes, query, currentTime]);

  const busCount = routes.reduce(
    (total, route) => total + (route.buses?.length || 0),
    0
  );

  const stats = [
    [
      'Total Registered Users',
      registeredCount === null ? '–' : String(registeredCount),
    ],
    ['Routes', loading ? '–' : String(routes.length)],
    ['Buses', loading ? '–' : String(busCount)],
    ['Access', 'Verified'],
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-brand via-[#0d7a4d] to-[#071d18] p-6 text-white shadow-lg md:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-live" />
              Live university bus transport
            </span>

            <h1 className="mt-4 text-3xl font-bold leading-tight md:text-5xl">
              PUST Bus Tracker
            </h1>

            <p className="mt-4 max-w-xl text-base text-white/85">
              See where your university bus is right now. Access is limited
              to verified students with a PUST institutional email.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={user ? '/routes' : '/login'}
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand shadow transition hover:bg-white/90"
            >
              {user ? 'Track buses' : 'Register now'}
            </Link>

            <Link
              to="/routes"
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
            >
              View routes
            </Link>
          </div>
        </div>

        {/* Home page statistics */}
        <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-white/70">
                {label}
              </dt>
              <dd className="mt-1 break-words text-xl font-bold md:text-2xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-card border border-line bg-surface p-4 md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Bus routes</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Pick a route to see its buses and where they are.
            </p>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search route name"
            aria-label="Search route name"
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-fg outline-none transition placeholder:text-fg-muted focus:border-brand-2 focus:ring-2 focus:ring-brand-2/30 md:max-w-sm"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-300/60 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {loading && (
          <p className="text-sm text-fg-muted">Loading routes…</p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {filteredRoutes.map((route) => {
            const scheduleStatus = getBusScheduleStatus(route.schedules, new Date(currentTime));
            const next = scheduleStatus
              ? scheduleStatus.running
                ? `Scheduled now · until ${formatTime(scheduleStatus.schedule.arrivalTime)}`
                : `${scheduleStatus.nextDay ? 'Tomorrow' : 'Today'} at ${formatTime(scheduleStatus.schedule.departureTime)}`
              : null;

            return (
              <article
                key={route.id}
                className="flex flex-col rounded-2xl border border-line bg-surface-2 p-5"
              >
                <h3 className="text-lg font-bold leading-snug">
                  {route.name}
                </h3>
                {scheduleStatus?.running && (
                  <span className="mt-2 w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-950/50 dark:text-green-300">
                    Scheduled now
                  </span>
                )}

                {route.description && (
                  <p className="mt-1 text-sm text-fg-muted">
                    {route.description}
                  </p>
                )}

                <dl className="mt-4 space-y-2 rounded-xl border border-line bg-surface p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-muted">Bus times</dt>
                    <dd className="text-right font-medium">
                      {route.schedules?.length
                        ? route.schedules
                            .map((schedule) =>
                              formatTime(schedule.departureTime)
                            )
                            .join(' · ')
                        : 'Not announced'}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-muted">Next departure</dt>
                    <dd className="font-medium">{next ?? '–'}</dd>
                  </div>

                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-muted">Buses</dt>
                    <dd className="font-medium">
                      {route.buses?.length || 0}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-sm text-fg-muted">
                    Verified students only
                  </span>

                  <Link
                    to={route.busId ? `/track/${route.busId}` : '/routes'}
                    className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Track route
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && !error && filteredRoutes.length === 0 && (
          <p className="text-sm text-fg-muted">
            {routes.length
              ? 'No route matches your search.'
              : 'No routes have been added yet.'}
          </p>
        )}
      </section>
    </main>
  );
}
