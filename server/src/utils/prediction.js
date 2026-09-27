import { point, lineString } from '@turf/helpers';
import destination from '@turf/destination';
import nearestPointOnLine from '@turf/nearest-point-on-line';

/**
 * Given the last confirmed ping for a bus and how long ago it happened,
 * decide whether the bus's position is 'confirmed', 'predicted', or 'stale',
 * and compute the position to show for each case.
 *
 * @param {Object} lastConfirmed - { lat, lng, speed (m/s), heading (deg), recordedAt (Date) }
 * @param {Array<{lat:number, lng:number}>} routeStops - ordered stops for this bus's route (optional)
 * @param {Object} thresholds - { confirmedTimeoutMs, staleTimeoutMs }
 * @param {Date} [now] - defaults to current time; pass explicitly in tests
 * @returns {{ state: 'confirmed'|'predicted'|'stale', lat: number, lng: number }}
 */
export function computeBusPosition(lastConfirmed, routeStops, thresholds, now = new Date()) {
  const { confirmedTimeoutMs, staleTimeoutMs } = thresholds;
  const elapsedMs = now.getTime() - new Date(lastConfirmed.recordedAt).getTime();

  if (elapsedMs < confirmedTimeoutMs) {
    return { state: 'confirmed', lat: lastConfirmed.lat, lng: lastConfirmed.lng };
  }

  // Keep estimating from the last confirmed speed and heading, but stop moving
  // the marker after the stale threshold to avoid an unbounded projection.
  const projectionElapsedMs = Math.min(Math.max(elapsedMs, 0), staleTimeoutMs);
  const elapsedSeconds = projectionElapsedMs / 1000;
  const distanceMeters = (lastConfirmed.speed || 0) * elapsedSeconds;
  const distanceKm = distanceMeters / 1000;

  const from = point([lastConfirmed.lng, lastConfirmed.lat]);
  const projected =
    distanceKm > 0
      ? destination(from, distanceKm, lastConfirmed.heading || 0, { units: 'kilometers' })
      : from;

  if (!routeStops || routeStops.length < 2) {
    const [lng, lat] = projected.geometry.coordinates;
    return { state: elapsedMs >= staleTimeoutMs ? 'stale' : 'predicted', lat, lng };
  }

  const route = lineString(routeStops.map((s) => [s.lng, s.lat]));
  const snapped = nearestPointOnLine(route, projected);
  const [lng, lat] = snapped.geometry.coordinates;
  return { state: elapsedMs >= staleTimeoutMs ? 'stale' : 'predicted', lat, lng };
}
