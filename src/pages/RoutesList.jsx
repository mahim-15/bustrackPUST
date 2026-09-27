import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const routes = [
  {
    id: 'R1',
    busId: 1,
    name: 'Campus → Terminal → Meril → Gachpara → Shohor → Court → Ononto → Mujahid Club → Campus',
    schedule: '07:30 AM - 09:30 AM / 12:00 PM - 02:30 PM',
  },
  {
    id: 'R2',
    busId: 2,
    name: 'Campus → Terminal → Mujahid Club → Ononto → Court → Shohor → Gachpara → Meril → Campus',
    schedule: '08:00 AM - 10:00 AM / 01:00 PM - 03:00 PM',
  },
  {
    id: 'R3',
    busId: 3,
    name: 'Campus → Meril → Gachpara → Tebunia → Ishwardi → Campus',
    schedule: '09:00 AM - 11:00 AM / 02:00 PM - 04:00 PM',
  },
];

export default function RoutesList() {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [communityByRoute, setCommunityByRoute] = useState({});
  const [errorByRoute, setErrorByRoute] = useState({});

  async function toggleRoute(routeId) {
    if (selectedRoute === routeId) {
      setSelectedRoute(null);
      return;
    }

    setSelectedRoute(routeId);
    if (communityByRoute[routeId]) return;

    try {
      const route = routes.find((item) => item.id === routeId);
      const community = await api.getBusCommunity(route.busId);
      setCommunityByRoute((current) => ({ ...current, [routeId]: community }));
    } catch (error) {
      setErrorByRoute((current) => ({ ...current, [routeId]: error.message }));
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#557066] dark:text-[#9fe0be]">Community bus tracking</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#122218] dark:text-white">How would you like to help?</h1>
          <p className="mt-2 text-sm text-[#597067] dark:text-[#cfe6dc]">
            Select a route to see community activity, share your GPS location, or view the bus location.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {routes.map((route) => (
          <article
            key={route.id}
            className="rounded-[24px] border border-[#dfeae4] bg-white p-5 shadow-[0_10px_24px_rgba(17,34,25,0.04)] dark:border-[#16332d] dark:bg-[#0d1715]"
          >
            <button
              type="button"
              aria-expanded={selectedRoute === route.id}
              onClick={() => toggleRoute(route.id)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6c7f78] dark:text-[#9bb6ae]">Route</p>
                <h2 className="mt-2 text-xl font-semibold text-[#122218] dark:text-white">{route.name}</h2>
              </div>
              <span className="text-sm font-bold text-[#0b5d3b] dark:text-[#9fe0be]">
                {selectedRoute === route.id ? 'Close −' : 'Choose route +'}
              </span>
            </button>
            <div className="mt-4 text-sm text-[#567067] dark:text-[#cfe6dc]">
              <span>{route.schedule}</span>
            </div>
            {selectedRoute === route.id && (
              <div className="mt-5 border-t border-[#e3ece6] pt-5 dark:border-[#18342d]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    to={`/contribute/${route.id}`}
                    className="rounded-xl bg-[#0b5d3b] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#084a2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5d3b]"
                  >
                    Contribute my location
                  </Link>
                  <Link
                    to={`/track/${route.id}`}
                    className="rounded-xl border-2 border-[#0b5d3b] bg-white px-4 py-3 text-center text-sm font-bold text-[#0b5d3b] transition hover:bg-[#e7f3ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5d3b] dark:bg-[#102620] dark:text-[#9fe0be] dark:hover:bg-[#16332d]"
                  >
                    See bus location
                  </Link>
                </div>

                <section className="mt-5 rounded-2xl bg-[#f7faf8] p-4 dark:bg-[#102620]">
                  <h3 className="text-sm font-bold text-[#122218] dark:text-white">Verified student contributors</h3>
                  <p className="mt-1 text-sm text-[#597067] dark:text-[#cfe6dc]">
                    {communityByRoute[route.id]
                      ? `${communityByRoute[route.id].verifiedStudents} students have shared a verified GPS location for this route.`
                      : 'Loading community activity…'}
                  </p>

                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-[#122218] dark:text-white">Route comments</h4>
                    {communityByRoute[route.id]?.comments?.length ? (
                      <ul className="mt-2 space-y-2">
                        {communityByRoute[route.id].comments.map((comment) => (
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
                        {communityByRoute[route.id] ? 'No comments yet.' : 'Comments will appear here.'}
                      </p>
                    )}

                    {errorByRoute[route.id] && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{errorByRoute[route.id]}</p>}
                  </div>
                </section>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
