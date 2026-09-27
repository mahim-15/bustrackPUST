import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { api } from '../api/client.js';
import { getSocket } from '../api/socket.js';
import { useAuth } from '../context/useAuth.js';
import MapFollow from '../components/MapFollow.jsx';

const staticRoutes = {
  R1: {
    trackingBusId: 1,
    bus_number: 'Route R1',
    route_name: 'Campus - Terminal - Meril - Gachpara - Shohor - Court - Ononto - Mujahid Club - Campus',
    stops: ['Campus', 'Terminal', 'Meril', 'Gachpara', 'Shohor', 'Court', 'Ononto', 'Mujahid Club', 'Campus'],
  },
  R2: {
    trackingBusId: 2,
    bus_number: 'Route R2',
    route_name: 'Campus - Terminal - Mujahid Club - Ononto - Court - Shohor - Gachpara - Meril - Campus',
    stops: ['Campus', 'Terminal', 'Mujahid Club', 'Ononto', 'Court', 'Shohor', 'Gachpara', 'Meril', 'Campus'],
  },
  R3: {
    trackingBusId: 3,
    bus_number: 'Route R3',
    route_name: 'Campus - Meril - Gachpara - Tebunia - Ishwardi - Campus',
    stops: ['Campus', 'Meril', 'Gachpara', 'Tebunia', 'Ishwardi', 'Campus'],
  },
};

function timeAgo(timestamp) {
  if (!timestamp) return 'Waiting for GPS';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function locationLabel(location) {
  if (!location) return 'Waiting for a student to share GPS';
  if (location.state === 'confirmed') return `Shared GPS · ${timeAgo(location.timestamp)}`;
  if (location.state === 'predicted') return `Estimated from last shared GPS · ${timeAgo(location.timestamp)}`;
  return `Stale estimate from last shared GPS · ${timeAgo(location.timestamp)}`;
}

export default function BusTracking({ shareMode = false }) {
  const { busId } = useParams();
  const { user } = useAuth();
  const [loadedBus, setLoadedBus] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [error, setError] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('Not sharing');
  const [isSharing, setIsSharing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [hasContributed, setHasContributed] = useState(false);
  const [commentDismissed, setCommentDismissed] = useState(false);
  const [points, setPoints] = useState(null);
  const [comment, setComment] = useState('');
  const [commentStatus, setCommentStatus] = useState('');
  const [commentSubmitted, setCommentSubmitted] = useState(false);
  const watchIdRef = useRef(null);
  const sessionIdRef = useRef(null);
  const currentSessionRef = useRef(null);
  const bus = staticRoutes[busId] || loadedBus;
  const currentBusId = bus?.trackingBusId || Number(busId);
  const canShareGps = Boolean(user && user.approvalStatus === 'approved');

  useEffect(() => {
    if (staticRoutes[busId]) return;
    api.getBus(busId).then(setLoadedBus).catch((err) => setError(err.message));
  }, [busId]);

  useEffect(() => {
    const socket = getSocket();
    const subscribedBusId = staticRoutes[busId]?.trackingBusId || Number(busId);
    socket.emit('bus:subscribe', subscribedBusId);

    function onLocation(payload) {
      if (String(payload.busId) === String(subscribedBusId)) setBusLocation(payload);
    }

    function onRejected(payload) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      if (sessionIdRef.current !== null) {
        socket.emit('location:session:stop', { sessionId: sessionIdRef.current });
      }
      sessionIdRef.current = null;
      currentSessionRef.current = null;
      setSessionId(null);
      setIsSharing(false);
      setGpsStatus(`Not sharing — ${payload.reason}`);
    }

    function onLocationAccepted(payload) {
      if (String(payload.sessionId) !== String(currentSessionRef.current)) return;
      setHasContributed(true);
      setPoints(payload.points);
      setGpsStatus('Your location has been shared with students viewing this route');
    }

    function onPointAwarded(payload) {
      if (String(payload.sessionId) !== String(currentSessionRef.current)) return;
      setPoints(payload.points);
    }

    socket.on('bus:location', onLocation);
    socket.on('location:rejected', onRejected);
    socket.on('location:accepted', onLocationAccepted);
    socket.on('contribution:point-awarded', onPointAwarded);
    return () => {
      socket.emit('bus:unsubscribe', subscribedBusId);
      socket.off('bus:location', onLocation);
      socket.off('location:rejected', onRejected);
      socket.off('location:accepted', onLocationAccepted);
      socket.off('contribution:point-awarded', onPointAwarded);
    };
  }, [busId]);

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (sessionIdRef.current !== null) {
      getSocket().emit('location:session:stop', { sessionId: sessionIdRef.current });
    }
    watchIdRef.current = null;
    sessionIdRef.current = null;
    currentSessionRef.current = null;
  }, [busId, shareMode]);

  useEffect(() => {
    if (!shareMode || !user) return undefined;
    let cancelled = false;
    api.getMyPoints()
      .then(({ points: total }) => {
        if (!cancelled) setPoints(total);
      })
      .catch((err) => {
        if (!cancelled) setGpsStatus(`Could not load your points: ${err.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [shareMode, user]);

  async function startSharing() {
    if (!user) {
      setGpsStatus('Sign in with an approved student account first');
      return;
    }
    if (!canShareGps) {
      setGpsStatus('An approved student account is required to contribute');
      return;
    }
    if (!navigator.geolocation) {
      setGpsStatus('GPS is not supported by this browser');
      return;
    }

    setGpsStatus('Waiting for GPS permission...');
    const socket = getSocket();
    let session;
    try {
      session = await new Promise((resolve, reject) => {
        socket.timeout(10000).emit('location:session:start', { busId: currentBusId }, (err, response) => {
          if (err) return reject(new Error('Could not start GPS contribution. Check your connection and try again.'));
          if (response?.error) return reject(new Error(response.error));
          if (!response?.sessionId) return reject(new Error('Server did not start a contribution session.'));
          resolve(response);
        });
      });
    } catch (err) {
      setGpsStatus(err.message);
      return;
    }

    sessionIdRef.current = session.sessionId;
    currentSessionRef.current = session.sessionId;
    setSessionId(session.sessionId);
    setHasContributed(false);
    setComment('');
    setCommentStatus('');
    setCommentSubmitted(false);
    setCommentDismissed(false);
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        socket.emit('location:update', {
          busId: currentBusId,
          sessionId: session.sessionId,
          lat: coords.latitude,
          lng: coords.longitude,
          speed: coords.speed || 0,
          heading: coords.heading || 0,
        });
      },
      (geoError) => {
        watchIdRef.current = null;
        socket.emit('location:session:stop', { sessionId: session.sessionId });
        sessionIdRef.current = null;
        currentSessionRef.current = null;
        setIsSharing(false);
        setGpsStatus(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access in your browser settings to contribute.'
            : 'Unable to get GPS location. Check that your device location is enabled and try again.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    setIsSharing(true);
  }

  function stopSharing() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (sessionIdRef.current !== null) {
      getSocket().emit('location:session:stop', { sessionId: sessionIdRef.current });
    }
    watchIdRef.current = null;
    sessionIdRef.current = null;
    currentSessionRef.current = null;
    setSessionId(null);
    setIsSharing(false);
    setGpsStatus('Not sharing');
  }

  async function submitContributionComment(event) {
    event.preventDefault();
    if (!sessionId || !hasContributed || !comment.trim()) return;
    setCommentStatus('');
    try {
      await api.addBusComment(currentBusId, sessionId, comment.trim());
      setCommentSubmitted(true);
      setCommentStatus('Your optional comment has been posted.');
    } catch (err) {
      setCommentStatus(err.message);
    }
  }

  const stops = bus?.stops || [];
  const activeStop = useMemo(() => {
    if (!busLocation || !stops.length) return -1;
    return Math.min(stops.length - 1, Math.floor((busLocation.progress ?? 0) * stops.length));
  }, [busLocation, stops.length]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link to="/routes" className="text-sm text-[#597067] hover:text-[#123528] dark:text-[#cfe6dc] dark:hover:text-white">
        ← Back to routes
      </Link>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {bus && (
        <>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#557066] dark:text-[#9fe0be]">Live route timeline</p>
              <h1 className="mt-2 text-3xl font-semibold text-[#122218] dark:text-white">{bus.bus_number}</h1>
              <p className="mt-1 text-sm text-[#597067] dark:text-[#cfe6dc]">{bus.route_name}</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              busLocation?.state === 'confirmed'
                ? 'bg-[#d9f4e3] text-[#0b5d3b] dark:bg-[#123e2e] dark:text-[#9fe0be]'
                : 'bg-[#fff1d6] text-[#956117] dark:bg-[#493217] dark:text-[#ffd48a]'
            }`}>
              {locationLabel(busLocation)}
            </span>
          </div>

          <section className="mt-7 rounded-[28px] border border-[#dfeae4] bg-white p-5 shadow-sm dark:border-[#16332d] dark:bg-[#0d1715] md:p-7">
            <div className="flex items-center justify-between border-b border-[#edf2ee] pb-4 dark:border-[#16332d]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6c7f78] dark:text-[#9bb6ae]">Route progress</p>
                <h2 className="mt-1 text-xl font-semibold text-[#122218] dark:text-white">Where is the bus?</h2>
              </div>
              <span className="rounded-full bg-[#e7f3ea] px-3 py-1 text-xs font-semibold text-[#0b5d3b] dark:bg-[#102922] dark:text-[#9fe0be]">
                {busLocation?.state === 'confirmed' ? 'Live' : 'Awaiting live GPS'}
              </span>
            </div>

            <div className="mt-6">
              {stops.map((stop, index) => {
                const isActive = index === activeStop;
                const isPassed = activeStop >= 0 && index < activeStop;
                return (
                  <div key={`${stop}-${index}`} className="relative flex min-h-[78px] gap-4">
                    {index < stops.length - 1 && (
                      <span className={`absolute left-[11px] top-6 h-full w-0.5 ${isPassed ? 'bg-[#35b778]' : 'border-l-2 border-dotted border-[#bfd9ca] dark:border-[#315c4b]'}`} />
                    )}
                    <span className={`relative z-10 mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
                      isActive
                        ? 'border-[#f1a32f] bg-[#fff4df] text-[#a6660d] dark:border-[#f1a32f] dark:bg-[#503514]'
                        : isPassed
                        ? 'border-[#35b778] bg-[#35b778] text-white'
                        : 'border-[#6e8d80] bg-white dark:border-[#55766a] dark:bg-[#0d1715]'
                    }`}>
                      {isActive ? '•' : isPassed ? '✓' : ''}
                    </span>
                    <div className="flex flex-1 items-start justify-between gap-4 pb-5">
                      <div>
                        <p className={`text-lg font-semibold ${isActive ? 'text-[#122218] dark:text-white' : 'text-[#567067] dark:text-[#b8d0c5]'}`}>{stop}</p>
                        <p className="mt-1 text-xs text-[#6c7f78] dark:text-[#9bb6ae]">{isActive ? 'Current bus position' : index === 0 ? 'Departure point' : index === stops.length - 1 ? 'Final stop' : 'Route stop'}</p>
                      </div>
                      {isActive && <span className="rounded-full bg-[#fff0d1] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#a6660d] dark:bg-[#503514] dark:text-[#ffd48a]">Bus here</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 rounded-2xl border border-[#dfeae4] bg-[#f7faf8] p-4 dark:border-[#18342d] dark:bg-[#102620]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6c7f78] dark:text-[#9bb6ae]">Exact location status</p>
              <p className="mt-2 text-sm text-[#2f4a40] dark:text-[#dff4e8]">
                {busLocation
                  ? `${locationLabel(busLocation)}${Number.isFinite(Number(busLocation.lat)) && Number.isFinite(Number(busLocation.lng)) ? ` · ${Number(busLocation.lat).toFixed(5)}, ${Number(busLocation.lng).toFixed(5)}` : ''}`
                  : 'No live GPS ping has been received yet. A student can contribute their location from the route page.'}
              </p>
            </div>
          </section>

          {busLocation && Number.isFinite(Number(busLocation.lat)) && Number.isFinite(Number(busLocation.lng)) && (
            <section className="mt-6 overflow-hidden rounded-[24px] border border-[#dfeae4] bg-white shadow-sm dark:border-[#16332d] dark:bg-[#0d1715]">
              <div className="p-5">
                <h2 className="text-lg font-semibold text-[#122218] dark:text-white">Shared bus location</h2>
                <p className="mt-1 text-sm text-[#597067] dark:text-[#cfe6dc]">
                  Latest GPS position shared by a student · {timeAgo(busLocation.timestamp)}
                </p>
              </div>
              <MapContainer
                center={[Number(busLocation.lat), Number(busLocation.lng)]}
                zoom={15}
                scrollWheelZoom
                className="h-[360px] w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapFollow position={[Number(busLocation.lat), Number(busLocation.lng)]} />
                <CircleMarker
                  center={[Number(busLocation.lat), Number(busLocation.lng)]}
                  radius={11}
                  pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#0b5d3b', fillOpacity: 1 }}
                >
                  <Popup>{bus.bus_number} · shared GPS position</Popup>
                </CircleMarker>
              </MapContainer>
            </section>
          )}

          {shareMode && (
            <section className="mt-6 rounded-[24px] border border-[#dfeae4] bg-white p-5 dark:border-[#16332d] dark:bg-[#0d1715]">
              <h2 className="text-lg font-semibold text-[#122218] dark:text-white">Contribute your location</h2>
              <p className="mt-2 text-sm text-[#597067] dark:text-[#cfe6dc]">
                Share your phone’s live GPS with students viewing this bus. Your location is sent only while sharing is on. Please share while you are on this bus so its location is accurate.
              </p>
              <p className="mt-3 text-sm font-medium text-[#0b5d3b] dark:text-[#9fe0be]">{gpsStatus}</p>
              {points !== null && (
                <p className="mt-2 text-sm font-bold text-[#122218] dark:text-white">
                  Your contribution points: {points}
                </p>
              )}
              <button
                type="button"
                onClick={isSharing ? stopSharing : startSharing}
                disabled={!canShareGps}
                className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSharing ? 'bg-[#a12b2b] hover:bg-[#811e1e]' : 'bg-[#0b5d3b] hover:bg-[#084a2f]'
                }`}
              >
                {!canShareGps ? 'Approved student account required' : isSharing ? 'Stop sharing my location' : 'Start sharing my location'}
              </button>
              <p className="mt-2 text-xs text-[#6d7d77] dark:text-[#b8d0c5]">
                Your browser will ask permission. You can stop sharing at any time or by leaving this page.
              </p>
              {hasContributed && sessionId && !commentDismissed && (
                <div className="mt-5 rounded-2xl border border-[#c9e6d5] bg-[#f2faf5] p-4 dark:border-[#24543f] dark:bg-[#102620]">
                  <p className="text-sm font-bold text-[#0b5d3b] dark:text-[#9fe0be]">
                    You earned 1 point for this contribution session.
                  </p>
                  <p className="mt-1 text-xs text-[#597067] dark:text-[#cfe6dc]">
                    Add an optional comment about the bus or route (up to 50 words).
                  </p>
                  {!commentSubmitted ? (
                    <form onSubmit={submitContributionComment} className="mt-3">
                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={2}
                        maxLength={1000}
                        placeholder="Optional route update…"
                        className="w-full resize-y rounded-xl border border-[#dfeae4] bg-white px-3 py-2 text-sm text-[#123528] outline-none focus:border-[#0b5d3b] focus:ring-2 focus:ring-[#c8ead7] dark:border-[#18342d] dark:bg-[#0d1715] dark:text-[#edf7f2]"
                      />
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className={`text-xs ${comment.trim().split(/\s+/u).filter(Boolean).length > 50 ? 'text-red-600' : 'text-[#6c7f78] dark:text-[#9bb6ae]'}`}>
                          {comment.trim().split(/\s+/u).filter(Boolean).length}/50 words
                        </span>
                        <button
                          type="submit"
                          disabled={!comment.trim() || comment.trim().split(/\s+/u).filter(Boolean).length > 50}
                          className="rounded-lg bg-[#0b5d3b] px-3 py-2 text-sm font-bold text-white hover:bg-[#084a2f] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Post optional comment
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="mt-3 text-sm font-medium text-[#0b5d3b] dark:text-[#9fe0be]">{commentStatus}</p>
                  )}
                  {commentStatus && !commentSubmitted && (
                    <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{commentStatus}</p>
                  )}
                  {!comment.trim() && (
                    <button
                      type="button"
                      onClick={() => setCommentDismissed(true)}
                      className="mt-2 text-xs font-medium text-[#597067] underline dark:text-[#cfe6dc]"
                    >
                      Skip comment
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
