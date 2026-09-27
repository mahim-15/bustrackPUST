import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { computeBusPosition } from '../utils/prediction.js';

// In-memory cache of the latest confirmed ping per bus, so the prediction
// tick doesn't have to hit the DB every 5 seconds for every bus.
const lastConfirmedByBus = new Map();
// Route stops per bus, cached at startup / on demand — used for road-snapping predictions.
const routeStopsByBus = new Map();
const thresholds = {
  confirmedTimeoutMs: Number(process.env.CONFIRMED_TIMEOUT_MS) || 20000,
  staleTimeoutMs: Number(process.env.STALE_TIMEOUT_MS) || 240000,
};

async function getRouteStopsForBus(busId) {
  if (routeStopsByBus.has(busId)) return routeStopsByBus.get(busId);
  const [rows] = await pool.query(
    `SELECT rs.lat, rs.lng FROM route_stops rs
     JOIN buses b ON b.route_id = rs.route_id
     WHERE b.id = ? ORDER BY rs.sequence ASC`,
    [busId]
  );
  routeStopsByBus.set(busId, rows);
  return rows;
}

async function isApprovedStudentForBus(userId, busId) {
  const [rows] = await pool.query(
    `SELECT u.id FROM users u
     JOIN buses b ON b.id = ? AND b.status = 'active'
     WHERE u.id = ? AND u.approval_status = 'approved' AND u.role IN ('rider', 'tracker')`,
    [busId, userId]
  );
  return rows.length > 0;
}

export function registerTrackingSockets(io) {
  const nsp = io.of('/tracking');

  // Authenticate the socket connection using the same JWT as the REST API.
  nsp.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // riders can connect anonymously to just watch the map
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Invalid token just means they connect as an anonymous viewer, not a hard failure.
    }
    next();
  });

  nsp.on('connection', (socket) => {
    let lastLocationUpdateAt = 0;

    socket.on('bus:subscribe', async (busId) => {
      socket.join(`bus:${busId}`);
      try {
        const [rows] = await pool.query(
          `SELECT lat, lng, speed, heading, recorded_at AS timestamp
           FROM locations WHERE bus_id = ? ORDER BY recorded_at DESC LIMIT 1`,
          [busId]
        );
        const latest = rows[0];
        if (latest) {
        const lastConfirmed = {
          lat: Number(latest.lat),
          lng: Number(latest.lng),
          speed: Number(latest.speed || 0),
          heading: Number(latest.heading || 0),
          recordedAt: latest.timestamp,
        };
        lastConfirmedByBus.set(busId, lastConfirmed);
        const stops = await getRouteStopsForBus(busId);
        const position = computeBusPosition(lastConfirmed, stops, thresholds);
        socket.emit('bus:location', {
          busId,
          state: position.state,
          lat: position.lat,
          lng: position.lng,
          timestamp: latest.timestamp,
        });
        }
      } catch (err) {
        console.error('bus:subscribe latest location failed', err);
      }
    });

    socket.on('bus:unsubscribe', (busId) => {
      socket.leave(`bus:${busId}`);
    });

    socket.on('location:session:start', async (payload = {}, acknowledge = () => {}) => {
      try {
        if (!socket.user) {
          return acknowledge({ error: 'Sign in with an approved student account to contribute' });
        }
        const busId = Number(payload.busId);
        if (!Number.isInteger(busId) || busId < 1
          || !(await isApprovedStudentForBus(socket.user.id, busId))) {
          return acknowledge({ error: 'An approved student account and active bus are required' });
        }

        const [result] = await pool.query(
          'INSERT INTO contribution_sessions (user_id, bus_id) VALUES (?, ?)',
          [socket.user.id, busId]
        );
        acknowledge({ sessionId: result.insertId });
      } catch (err) {
        console.error('location:session:start failed', err);
        acknowledge({ error: 'Could not start a contribution session' });
      }
    });

    socket.on('location:session:stop', async (payload = {}) => {
      try {
        if (!socket.user || !Number.isInteger(Number(payload.sessionId))) return;
        await pool.query(
          'UPDATE contribution_sessions SET completed_at = COALESCE(completed_at, NOW()) WHERE id = ? AND user_id = ?',
          [Number(payload.sessionId), socket.user.id]
        );
      } catch (err) {
        console.error('location:session:stop failed', err);
      }
    });

    // Approved students may contribute their phone's GPS position for a bus.
    socket.on('location:update', async (payload = {}) => {
      try {
        if (!socket.user) {
          return socket.emit('location:rejected', { reason: 'Not authenticated' });
        }
        const busId = Number(payload.busId);
        const sessionId = Number(payload.sessionId);
        const { lat, lng, speed, heading } = payload;
        if (!Number.isInteger(busId) || busId < 1
          || !Number.isSafeInteger(sessionId) || sessionId < 1
          || !Number.isFinite(lat) || lat < -90 || lat > 90
          || !Number.isFinite(lng) || lng < -180 || lng > 180
          || (speed !== undefined && (!Number.isFinite(speed) || speed < 0))
          || (heading !== undefined && (!Number.isFinite(heading) || heading < 0 || heading > 360))) {
          return socket.emit('location:rejected', { reason: 'Invalid location data' });
        }

        if (Date.now() - lastLocationUpdateAt < 5000) return;

        const connection = await pool.getConnection();
        const recordedAt = new Date();
        let pointAwarded = false;
        let points = 0;
        try {
          await connection.beginTransaction();
          const [sessions] = await connection.query(
            `SELECT id, point_awarded AS pointAwarded FROM contribution_sessions
             WHERE id = ? AND user_id = ? AND bus_id = ? AND completed_at IS NULL
             FOR UPDATE`,
            [sessionId, socket.user.id, busId]
          );
          if (!sessions.length || !(await isApprovedStudentForBus(socket.user.id, busId))) {
            await connection.rollback();
            return socket.emit('location:rejected', { reason: 'Start a valid contribution session to share GPS' });
          }

          await connection.query(
            'INSERT INTO locations (bus_id, user_id, lat, lng, speed, heading, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [busId, socket.user.id, lat, lng, speed || 0, heading || 0, recordedAt]
          );

          if (!sessions[0].pointAwarded) {
            await connection.query(
              'UPDATE contribution_sessions SET point_awarded = TRUE WHERE id = ?',
              [sessionId]
            );
            await connection.query(
              `INSERT INTO student_points (user_id, points) VALUES (?, 1)
               ON DUPLICATE KEY UPDATE points = points + 1`,
              [socket.user.id]
            );
            pointAwarded = true;
          }

          const [pointRows] = await connection.query(
            'SELECT points FROM student_points WHERE user_id = ?',
            [socket.user.id]
          );
          points = pointRows[0]?.points || 0;
          await connection.commit();
          lastLocationUpdateAt = Date.now();
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }

        const confirmed = { lat, lng, speed, heading, recordedAt };
        lastConfirmedByBus.set(busId, confirmed);

        nsp.to(`bus:${busId}`).emit('bus:location', {
          busId,
          state: 'confirmed',
          lat,
          lng,
          timestamp: recordedAt,
        });
        socket.emit('location:accepted', { sessionId, points });
        if (pointAwarded) socket.emit('contribution:point-awarded', { sessionId, points });
      } catch (err) {
        console.error('location:update failed', err);
      }
    });

    socket.on('disconnect', () => {
      // no per-bus cleanup needed — room membership is dropped automatically
    });
  });

  // Prediction / stale tick: for every bus with a known last-confirmed ping,
  // recompute its displayed position and broadcast it if it has moved into
  // the predicted or stale state.
  const tickMs = Number(process.env.PREDICTION_TICK_MS) || 5000;
  setInterval(async () => {
    for (const [busId, lastConfirmed] of lastConfirmedByBus.entries()) {
      const elapsedMs = Date.now() - new Date(lastConfirmed.recordedAt).getTime();
      if (elapsedMs < thresholds.confirmedTimeoutMs) continue; // still fresh, nothing to broadcast

      const stops = await getRouteStopsForBus(busId);
      const position = computeBusPosition(lastConfirmed, stops, thresholds);

      nsp.to(`bus:${busId}`).emit('bus:location', {
        busId,
        state: position.state,
        lat: position.lat,
        lng: position.lng,
        timestamp: lastConfirmed.recordedAt,
      });
    }
  }, tickMs);

  return nsp;
}
