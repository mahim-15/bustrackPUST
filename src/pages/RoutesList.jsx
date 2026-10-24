import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { getBusScheduleStatus, sortRoutesBySchedule } from '../utils/busSchedule.js';

function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function RoutesList() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [communityByRoute, setCommunityByRoute] = useState({});
  const [errorByRoute, setErrorByRoute] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedRoutes = useMemo(
    () => sortRoutesBySchedule(routes, new Date(currentTime)),
    [routes, currentTime]
  );

  useEffect(() => {
    let cancelled = false;
    api.getRoutes()
      .then((result) => {
        if (!cancelled) setRoutes(result);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleRoute(route) {
    const routeId = String(route.id);
    if (selectedRoute === routeId) {
      setSelectedRoute(null);
      return;
    }

    setSelectedRoute(routeId);
    if (!route.busId || communityByRoute[routeId]) return;

    try {
      const community = await api.getBusCommunity(route.busId);
      setCommunityByRoute((current) => ({ ...current, [routeId]: community }));
    } catch (loadError) {
      setErrorByRoute((current) => ({ ...current, [routeId]: loadError.message }));
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#557066] dark:text-[#9fe0be]">Public bus routes</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#122218] dark:text-white">PUST bus routes and times</h1>
        <p className="mt-2 text-sm text-[#597067] dark:text-[#cfe6dc]">
          Browse route details and schedules. Sign in to view live bus tracking or contribute your location.
        </p>
      </div>

      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {loading ? (
        <p className="text-sm text-[#597067] dark:text-[#cfe6dc]">Loading routes…</p>
      ) : routes.length ? (
        <div className="grid gap-4">
          {sortedRoutes.map((route) => {
            const routeId = String(route.id);
            const scheduleStatus = getBusScheduleStatus(route.schedules, new Date(currentTime));
            const schedule = route.schedules?.length
              ? route.schedules.map((item) => `${formatTime(item.departureTime)} – ${formatTime(item.arrivalTime)}`).join(' / ')
              : 'Times not announced';
            return (
              <article
                key={route.id}
                className="rounded-[24px] border border-[#dfeae4] bg-white p-5 shadow-[0_10px_24px_rgba(17,34,25,0.04)] dark:border-[#16332d] dark:bg-[#0d1715]"
              >
                <button
                  type="button"
                  aria-expanded={selectedRoute === routeId}
                  onClick={() => toggleRoute(route)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6c7f78] dark:text-[#9bb6ae]">Route</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#122218] dark:text-white">{route.name}</h2>
                    {scheduleStatus?.running && (
                      <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-950/50 dark:text-green-300">
                        Scheduled now
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[#0b5d3b] dark:text-[#9fe0be]">
                    {selectedRoute === routeId ? 'Close −' : 'Details +'}
                  </span>
                </button>
                {route.description && <p className="mt-3 text-sm text-[#597067] dark:text-[#cfe6dc]">{route.description}</p>}
                {route.buses?.length > 0 && (
                  <p className="mt-3 text-sm text-[#597067] dark:text-[#cfe6dc]">
                    <span className="font-semibold">Buses: </span>
                    {route.buses.map((bus) => bus.busNumber).join(' · ')}
                  </p>
                )}
                <p className="mt-4 text-sm font-medium text-[#2f4a40] dark:text-[#dff4e8]">
                  <span className="font-semibold">Bus times: </span>{schedule}
                </p>

                {selectedRoute === routeId && (
                  <div className="mt-5 border-t border-[#e3ece6] pt-5 dark:border-[#18342d]">
                    {route.buses?.length ? (
                      <ul className="space-y-3">
                        {route.buses.map((bus) => (
                          <li key={bus.id} className="rounded-xl bg-[#f7faf8] p-3 dark:bg-[#102620]">
                            <p className="mb-3 text-sm font-semibold text-[#122218] dark:text-white">{bus.busNumber}</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Link
                                to={`/contribute/${bus.id}`}
                                className="rounded-xl bg-[#0b5d3b] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#084a2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5d3b]"
                              >
                                Contribute my location
                              </Link>
                              <Link
                                to={`/track/${bus.id}`}
                                className="rounded-xl border-2 border-[#0b5d3b] bg-white px-4 py-3 text-center text-sm font-bold text-[#0b5d3b] transition hover:bg-[#e7f3ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5d3b] dark:bg-[#102620] dark:text-[#9fe0be] dark:hover:bg-[#16332d]"
                              >
                                See bus location
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[#597067] dark:text-[#cfe6dc]">Live tracking is not available for this route yet.</p>
                    )}

                    {route.busId && (
                      <section className="mt-5 rounded-2xl bg-[#f7faf8] p-4 dark:bg-[#102620]">
                        <h3 className="text-sm font-bold text-[#122218] dark:text-white">Verified student contributors</h3>
                        <p className="mt-1 text-sm text-[#597067] dark:text-[#cfe6dc]">
                          {communityByRoute[routeId]
                            ? `${communityByRoute[routeId].verifiedStudents} students have shared a verified GPS location for this route.`
                            : 'Loading community activity…'}
                        </p>

                        <div className="mt-4">
                          <h4 className="text-sm font-bold text-[#122218] dark:text-white">Route comments</h4>
                          {communityByRoute[routeId]?.comments?.length ? (
                            <ul className="mt-2 space-y-2">
                              {communityByRoute[routeId].comments.map((comment) => (
                                <li key={comment.id} className="rounded-xl border border-[#e3ece6] bg-white p-3 dark:border-[#18342d] dark:bg-[#0d1715]">
                                  <p className="break-words text-sm text-[#2f4a40] dark:text-[#dff4e8]">{comment.comment}</p>
                                  <p className="mt-1 text-xs text-[#6c7f78] dark:text-[#9bb6ae]">
                                    {comment.author} · {new Date(comment.createdAt).toLocaleString()}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm text-[#6c7f78] dark:text-[#9bb6ae]">
                              {communityByRoute[routeId] ? 'No comments yet.' : 'Comments will appear here.'}
                            </p>
                          )}

                          {errorByRoute[routeId] && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{errorByRoute[routeId]}</p>}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-[#dfeae4] bg-white p-5 text-sm text-[#597067] dark:border-[#16332d] dark:bg-[#0d1715] dark:text-[#cfe6dc]">No routes are available yet.</p>
      )}
    </div>
  );
}
