import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const fieldClass = 'mt-1 w-full rounded-xl border border-[#dfeae4] bg-[#f7faf8] px-3 py-2.5 text-sm text-[#123528] outline-none focus:border-[#0b5d3b] focus:ring-2 focus:ring-[#c8ead7] dark:border-[#18342d] dark:bg-[#0f1d1a] dark:text-[#edf7f2]';

export default function AdminPanel() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [description, setDescription] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [editRouteName, setEditRouteName] = useState('');
  const [editRouteDescription, setEditRouteDescription] = useState('');
  const [editingBusId, setEditingBusId] = useState(null);
  const [editBusNumber, setEditBusNumber] = useState('');
  const [editBusRouteId, setEditBusRouteId] = useState('');
  const [newBusNumber, setNewBusNumber] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editDepartureTime, setEditDepartureTime] = useState('');
  const [editArrivalTime, setEditArrivalTime] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  async function loadRoutes() {
    setLoading(true);
    try {
      const result = await api.getRoutes();
      setRoutes(result);
      setSelectedRouteId((current) => (
        result.some((route) => String(route.id) === String(current))
          ? current
          : result[0] ? String(result[0].id) : ''
      ));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api.getRoutes()
      .then((result) => {
        if (cancelled) return;
        setRoutes(result);
        setSelectedRouteId((current) => (
          result.some((route) => String(route.id) === String(current))
            ? current
            : result[0] ? String(result[0].id) : ''
        ));
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

  async function createRoute(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const route = await api.createRoute({ name: routeName, description, busNumber });
      setRouteName('');
      setDescription('');
      setBusNumber('');
      setSelectedRouteId(String(route.id));
      setNotice('Route and bus added.');
      await loadRoutes();
      setSelectedRouteId(String(route.id));
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function addSchedule(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api.addRouteSchedule(selectedRouteId, { departureTime, arrivalTime });
      setDepartureTime('');
      setArrivalTime('');
      setNotice('Bus time added and published on the public routes page.');
      await loadRoutes();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function addBus(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const bus = await api.createBus({ busNumber: newBusNumber, routeId: selectedRouteId });
      setNewBusNumber('');
      setNotice(`${bus.busNumber} added to the route and published for everyone.`);
      await loadRoutes();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startEditingRoute(route) {
    setError('');
    setNotice('');
    setEditingRouteId(route.id);
    setEditRouteName(route.name);
    setEditRouteDescription(route.description || '');
  }

  async function saveRoute(event, routeId) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api.updateRoute(routeId, { name: editRouteName, description: editRouteDescription });
      setEditingRouteId(null);
      setNotice('Route updated and published.');
      await loadRoutes();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRoute(route) {
    if (!window.confirm(`Delete ${route.name}, including its buses and bus times?`)) return;
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api.deleteRoute(route.id);
      if (editingRouteId === route.id) setEditingRouteId(null);
      setNotice('Route, buses, and times deleted from the public routes page.');
      await loadRoutes();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startEditingBus(bus, routeId) {
    setError('');
    setNotice('');
    setEditingBusId(bus.id);
    setEditBusNumber(bus.busNumber);
    setEditBusRouteId(String(routeId));
  }

  async function saveBus(event, busId) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api.updateBus(busId, { busNumber: editBusNumber, routeId: editBusRouteId });
      setEditingBusId(null);
      setNotice('Bus updated and published.');
      await loadRoutes();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteBus(bus) {
    if (!window.confirm(`Delete ${bus.busNumber}? Its tracking assignments will also be removed.`)) return;
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api.deleteBus(bus.id);
      if (editingBusId === bus.id) setEditingBusId(null);
      setNotice('Bus deleted from public routes.');
      await loadRoutes();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startEditingSchedule(schedule) {
    setError('');
    setNotice('');
    setEditingScheduleId(schedule.id);
    setEditDepartureTime(schedule.departureTime);
    setEditArrivalTime(schedule.arrivalTime);
  }

  async function saveSchedule(event, scheduleId) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api.updateRouteSchedule(scheduleId, {
        departureTime: editDepartureTime,
        arrivalTime: editArrivalTime,
      });
      setEditingScheduleId(null);
      setNotice('Bus time updated and published.');
      await loadRoutes();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSchedule(schedule) {
    if (!window.confirm(`Delete the ${schedule.departureTime}–${schedule.arrivalTime} bus time?`)) return;
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api.deleteRouteSchedule(schedule.id);
      if (editingScheduleId === schedule.id) setEditingScheduleId(null);
      setNotice('Bus time deleted from the public schedule.');
      await loadRoutes();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyPublicLink() {
    setShareStatus('');
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/routes`);
      setShareStatus('Public routes link copied.');
    } catch {
      setShareStatus('Could not copy the link. Open the public routes page and copy its URL.');
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#557066] dark:text-[#9fe0be]">Private workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#122218] dark:text-white">Route administration</h1>
          <p className="mt-2 text-sm text-[#597067] dark:text-[#cfe6dc]">
            Add routes, buses, and bus times. The Admin option is only visible to administrators; public updates appear on Routes.
          </p>
        </div>
        <Link to="/routes" className="text-sm font-semibold text-[#0b5d3b] hover:underline dark:text-[#9fe0be]">
          View public routes →
        </Link>
      </div>

      <nav aria-label="Admin actions" className="mb-6 flex flex-wrap gap-3">
        <a href="#add-route" className="rounded-xl bg-[#0b5d3b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#084a2f]">Add route</a>
        <a href="#add-bus" className="rounded-xl border border-[#0b5d3b] px-4 py-2.5 text-sm font-bold text-[#0b5d3b] hover:bg-[#e7f3ea] dark:text-[#9fe0be] dark:hover:bg-[#102620]">Add bus</a>
        <a href="#add-bus-times" className="rounded-xl border border-[#0b5d3b] px-4 py-2.5 text-sm font-bold text-[#0b5d3b] hover:bg-[#e7f3ea] dark:text-[#9fe0be] dark:hover:bg-[#102620]">Add bus times</a>
      </nav>

      <section className="mb-6 rounded-2xl border border-[#c9e6d5] bg-[#f2faf5] p-5 dark:border-[#24543f] dark:bg-[#102620]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[#122218] dark:text-white">Share public routes and times</h2>
            <p className="mt-1 text-sm text-[#597067] dark:text-[#cfe6dc]">
              Anyone with the routes page link can view published schedules. This admin panel remains private.
            </p>
            {shareStatus && <p role="status" className="mt-2 text-sm font-medium text-[#0b5d3b] dark:text-[#9fe0be]">{shareStatus}</p>}
          </div>
          <button
            type="button"
            onClick={copyPublicLink}
            className="rounded-xl bg-[#0b5d3b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#084a2f]"
          >
            Copy public link
          </button>
        </div>
      </section>

      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="mb-5 rounded-xl bg-[#e7f3ea] p-3 text-sm font-medium text-[#0b5d3b] dark:bg-[#102922] dark:text-[#9fe0be]">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <section id="add-route" className="scroll-mt-6 rounded-[24px] border border-[#dfeae4] bg-white p-5 shadow-sm dark:border-[#16332d] dark:bg-[#0d1715]">
          <h2 className="text-xl font-semibold text-[#122218] dark:text-white">Add a route</h2>
          <p className="mt-1 text-sm text-[#597067] dark:text-[#cfe6dc]">Create a route with its first bus for public tracking.</p>
          <form onSubmit={createRoute} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">
              Route name
              <input value={routeName} onChange={(event) => setRouteName(event.target.value)} maxLength={100} required className={fieldClass} placeholder="e.g. Route R4" />
            </label>
            <label className="block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">
              Route / stop details
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} className={fieldClass} placeholder="e.g. Campus - Central Stop - Campus" />
            </label>
            <label className="block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">
              Bus name
              <input value={busNumber} onChange={(event) => setBusNumber(event.target.value)} maxLength={20} required className={fieldClass} placeholder="e.g. Route R4 Bus" />
            </label>
            <button type="submit" disabled={submitting} className="rounded-xl bg-[#0b5d3b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#084a2f] disabled:opacity-50">
              {submitting ? 'Saving…' : 'Add route and bus'}
            </button>
          </form>
        </section>

        <section id="add-bus" className="scroll-mt-6 rounded-[24px] border border-[#dfeae4] bg-white p-5 shadow-sm dark:border-[#16332d] dark:bg-[#0d1715]">
          <h2 className="text-xl font-semibold text-[#122218] dark:text-white">Add a bus</h2>
          <p className="mt-1 text-sm text-[#597067] dark:text-[#cfe6dc]">Add another bus to an existing public route.</p>
          <form onSubmit={addBus} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">
              Route
              <select value={selectedRouteId} onChange={(event) => setSelectedRouteId(event.target.value)} required disabled={!routes.length || loading} className={fieldClass}>
                {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">
              Bus name
              <input value={newBusNumber} onChange={(event) => setNewBusNumber(event.target.value)} maxLength={20} required className={fieldClass} placeholder="e.g. Route R1 Bus 2" />
            </label>
            <button type="submit" disabled={submitting || loading || !routes.length} className="rounded-xl bg-[#0b5d3b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#084a2f] disabled:opacity-50">
              {submitting ? 'Saving…' : 'Add bus'}
            </button>
          </form>
        </section>

        <section id="add-bus-times" className="scroll-mt-6 rounded-[24px] border border-[#dfeae4] bg-white p-5 shadow-sm dark:border-[#16332d] dark:bg-[#0d1715]">
          <h2 className="text-xl font-semibold text-[#122218] dark:text-white">Add bus times</h2>
          <p className="mt-1 text-sm text-[#597067] dark:text-[#cfe6dc]">Times are immediately shown to visitors on the public routes page.</p>
          <form onSubmit={addSchedule} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">
              Route
              <select value={selectedRouteId} onChange={(event) => setSelectedRouteId(event.target.value)} required disabled={!routes.length || loading} className={fieldClass}>
                {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">
                Departure
                <input type="time" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} required className={fieldClass} />
              </label>
              <label className="block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">
                Arrival
                <input type="time" value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} required className={fieldClass} />
              </label>
            </div>
            <button type="submit" disabled={submitting || loading || !routes.length} className="rounded-xl bg-[#0b5d3b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#084a2f] disabled:opacity-50">
              {submitting ? 'Saving…' : 'Add bus time'}
            </button>
          </form>
        </section>
      </div>

      <section className="mt-8 rounded-[24px] border border-[#dfeae4] bg-white p-5 shadow-sm dark:border-[#16332d] dark:bg-[#0d1715]">
        <h2 className="text-xl font-semibold text-[#122218] dark:text-white">Current routes and times</h2>
        {loading ? (
          <p className="mt-4 text-sm text-[#597067] dark:text-[#cfe6dc]">Loading routes…</p>
        ) : routes.length ? (
          <ul className="mt-4 divide-y divide-[#e3ece6] dark:divide-[#18342d]">
            {routes.map((route) => (
              <li key={route.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-semibold text-[#122218] dark:text-white">{route.name}</p>
                  {editingRouteId !== route.id && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEditingRoute(route)} disabled={submitting} className="rounded-lg border border-[#dfeae4] px-3 py-1.5 text-xs font-semibold text-[#2b3e36] hover:bg-[#f7faf8] disabled:opacity-50 dark:border-[#315c4b] dark:text-[#dff4e8] dark:hover:bg-[#102620]">
                        Edit route
                      </button>
                      <button type="button" onClick={() => deleteRoute(route)} disabled={submitting} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">
                        Delete route
                      </button>
                    </div>
                  )}
                </div>
                {editingRouteId === route.id && (
                  <form onSubmit={(event) => saveRoute(event, route.id)} className="mt-3 space-y-3 rounded-xl bg-[#f7faf8] p-3 dark:bg-[#102620]">
                    <label className="block text-xs font-medium text-[#2b3e36] dark:text-[#dff4e8]">
                      Route name
                      <input value={editRouteName} onChange={(event) => setEditRouteName(event.target.value)} maxLength={100} required className={fieldClass} />
                    </label>
                    <label className="block text-xs font-medium text-[#2b3e36] dark:text-[#dff4e8]">
                      Route details
                      <textarea value={editRouteDescription} onChange={(event) => setEditRouteDescription(event.target.value)} maxLength={2000} rows={2} className={fieldClass} />
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" disabled={submitting} className="rounded-lg bg-[#0b5d3b] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Save route</button>
                      <button type="button" onClick={() => setEditingRouteId(null)} className="rounded-lg border border-[#dfeae4] px-3 py-2 text-sm font-semibold text-[#49635b] dark:border-[#315c4b] dark:text-[#dff4e8]">Cancel</button>
                    </div>
                  </form>
                )}
                {route.description && <p className="mt-1 text-sm text-[#597067] dark:text-[#cfe6dc]">{route.description}</p>}
                {route.buses?.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {route.buses.map((bus) => (
                      <li key={bus.id} className="rounded-xl bg-[#f7faf8] p-3 dark:bg-[#102620]">
                        {editingBusId === bus.id ? (
                          <form onSubmit={(event) => saveBus(event, bus.id)} className="flex flex-wrap items-end gap-3">
                            <label className="min-w-40 flex-1 text-xs font-medium text-[#2b3e36] dark:text-[#dff4e8]">
                              Bus name
                              <input value={editBusNumber} onChange={(event) => setEditBusNumber(event.target.value)} maxLength={20} required className={fieldClass} />
                            </label>
                            <label className="min-w-40 flex-1 text-xs font-medium text-[#2b3e36] dark:text-[#dff4e8]">
                              Route
                              <select value={editBusRouteId} onChange={(event) => setEditBusRouteId(event.target.value)} required className={fieldClass}>
                                {routes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                              </select>
                            </label>
                            <div className="flex gap-2">
                              <button type="submit" disabled={submitting} className="rounded-lg bg-[#0b5d3b] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Save</button>
                              <button type="button" onClick={() => setEditingBusId(null)} className="rounded-lg border border-[#dfeae4] px-3 py-2 text-sm font-semibold text-[#49635b] dark:border-[#315c4b] dark:text-[#dff4e8]">Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-medium text-[#122218] dark:text-white">{bus.busNumber}</p>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => startEditingBus(bus, route.id)} disabled={submitting} className="rounded-lg border border-[#dfeae4] px-3 py-1.5 text-xs font-semibold text-[#2b3e36] hover:bg-white disabled:opacity-50 dark:border-[#315c4b] dark:text-[#dff4e8] dark:hover:bg-[#0d1715]">Edit bus</button>
                              <button type="button" onClick={() => deleteBus(bus)} disabled={submitting} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">Delete bus</button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {route.schedules.length ? (
                  <ul className="mt-3 space-y-2">
                    {route.schedules.map((schedule) => (
                      <li key={schedule.id} className="rounded-xl bg-[#f7faf8] p-3 dark:bg-[#102620]">
                        {editingScheduleId === schedule.id ? (
                          <form onSubmit={(event) => saveSchedule(event, schedule.id)} className="flex flex-wrap items-end gap-3">
                            <label className="text-xs font-medium text-[#2b3e36] dark:text-[#dff4e8]">
                              Departure
                              <input
                                type="time"
                                value={editDepartureTime}
                                onChange={(event) => setEditDepartureTime(event.target.value)}
                                required
                                className={`${fieldClass} min-w-36`}
                              />
                            </label>
                            <label className="text-xs font-medium text-[#2b3e36] dark:text-[#dff4e8]">
                              Arrival
                              <input
                                type="time"
                                value={editArrivalTime}
                                onChange={(event) => setEditArrivalTime(event.target.value)}
                                required
                                className={`${fieldClass} min-w-36`}
                              />
                            </label>
                            <button type="submit" disabled={submitting} className="rounded-lg bg-[#0b5d3b] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                              Save
                            </button>
                            <button type="button" onClick={() => setEditingScheduleId(null)} className="rounded-lg border border-[#dfeae4] px-3 py-2 text-sm font-semibold text-[#49635b] dark:border-[#315c4b] dark:text-[#dff4e8]">
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-medium text-[#0b5d3b] dark:text-[#9fe0be]">
                              {schedule.departureTime}–{schedule.arrivalTime}
                            </p>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => startEditingSchedule(schedule)} disabled={submitting} className="rounded-lg border border-[#dfeae4] px-3 py-1.5 text-xs font-semibold text-[#2b3e36] hover:bg-white disabled:opacity-50 dark:border-[#315c4b] dark:text-[#dff4e8] dark:hover:bg-[#0d1715]">
                                Edit
                              </button>
                              <button type="button" onClick={() => deleteSchedule(schedule)} disabled={submitting} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[#597067] dark:text-[#cfe6dc]">No bus times added yet</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[#597067] dark:text-[#cfe6dc]">No routes available.</p>
        )}
      </section>
    </main>
  );
}
