import { point, lineString } from '@turf/helpers';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import length from '@turf/length';

/**
 * Given a bus's current lat/lng and its ordered route stops, return how far
 * along the route (0-100) the bus currently is. Used only for the visual
 * progress bar on the dashboard — not persisted anywhere.
 */
export function percentAlongRoute(position, stops) {
  if (!position || !stops || stops.length < 2) return null;

  const line = lineString(stops.map((s) => [s.lng, s.lat]));
  const total = length(line, { units: 'kilometers' });
  if (total === 0) return null;

  const snapped = nearestPointOnLine(line, point([position.lng, position.lat]));
  const travelled = snapped.properties.location; // km along the line

  return Math.max(0, Math.min(100, Math.round((travelled / total) * 100)));
}