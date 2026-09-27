import { computeBusPosition } from './prediction.js';

const thresholds = { confirmedTimeoutMs: 20000, staleTimeoutMs: 240000 };

const routeStops = [
  { lat: 24.0092, lng: 89.2528 },
  { lat: 24.005, lng: 89.248 },
  { lat: 24.0005, lng: 89.245 },
  { lat: 23.996, lng: 89.24 },
];

function lastConfirmedAt(msAgo, overrides = {}) {
  return {
    lat: 24.0092,
    lng: 89.2528,
    speed: 8, // m/s
    heading: 200,
    recordedAt: new Date(Date.now() - msAgo),
    ...overrides,
  };
}

describe('computeBusPosition', () => {
  test('returns confirmed state within the confirmed window', () => {
    const result = computeBusPosition(lastConfirmedAt(5000), routeStops, thresholds);
    expect(result.state).toBe('confirmed');
    expect(result.lat).toBeCloseTo(24.0092);
    expect(result.lng).toBeCloseTo(89.2528);
  });

  test('returns predicted state between the confirmed and stale windows', () => {
    const result = computeBusPosition(lastConfirmedAt(60000), routeStops, thresholds);
    expect(result.state).toBe('predicted');
    // Predicted point should have moved from the last known point, and stay near the route.
    expect(result.lat).not.toBeCloseTo(24.0092, 3);
  });

  test('returns a bounded stale estimate past the stale window', () => {
    const result = computeBusPosition(lastConfirmedAt(300000), routeStops, thresholds);
    expect(result.state).toBe('stale');
    expect(Number.isFinite(result.lat)).toBe(true);
    expect(Number.isFinite(result.lng)).toBe(true);
    expect(result.lat).not.toBeCloseTo(24.0092, 4);
    expect(result.lng).not.toBeCloseTo(89.2528, 4);
  });

  test('predicted position stays close to the route polyline (does not drift off-road)', () => {
    const result = computeBusPosition(lastConfirmedAt(90000, { speed: 15 }), routeStops, thresholds);
    // A point "close to the route" should sit within a small bounding box around the stops.
    expect(result.lat).toBeLessThanOrEqual(24.0092);
    expect(result.lat).toBeGreaterThanOrEqual(23.996);
  });

  test('falls back to raw dead-reckoning when no route is provided', () => {
    const result = computeBusPosition(lastConfirmedAt(60000), [], thresholds);
    expect(result.state).toBe('predicted');
    expect(typeof result.lat).toBe('number');
    expect(typeof result.lng).toBe('number');
  });

  test('zero speed keeps the predicted point at the last known location', () => {
    const result = computeBusPosition(
      lastConfirmedAt(60000, { speed: 0 }),
      routeStops,
      thresholds
    );
    expect(result.state).toBe('predicted');
    expect(result.lat).toBeCloseTo(24.0092, 3);
    expect(result.lng).toBeCloseTo(89.2528, 3);
  });
});
