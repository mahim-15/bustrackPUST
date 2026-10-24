import express from 'express';
import { pool } from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public reads — the map screen needs these without login

router.get('/routes', async (req, res) => {
  const [routes] = await pool.query(
    'SELECT r.id, r.name, r.description FROM routes r ORDER BY r.id'
  );
  const [buses] = await pool.query(
    `SELECT id, route_id AS routeId, bus_number AS busNumber
     FROM buses WHERE status = 'active' ORDER BY id`
  );
  const [schedules] = await pool.query(
    `SELECT id, route_id AS routeId,
       TIME_FORMAT(departure_time, '%H:%i') AS departureTime,
       TIME_FORMAT(arrival_time, '%H:%i') AS arrivalTime
     FROM route_schedules ORDER BY departure_time`
  );
  const schedulesByRoute = new Map();
  const busesByRoute = new Map();
  for (const bus of buses) {
    const routeBuses = busesByRoute.get(bus.routeId) || [];
    routeBuses.push({ id: bus.id, busNumber: bus.busNumber });
    busesByRoute.set(bus.routeId, routeBuses);
  }
  for (const schedule of schedules) {
    const routeSchedules = schedulesByRoute.get(schedule.routeId) || [];
    routeSchedules.push({
      id: schedule.id,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
    });
    schedulesByRoute.set(schedule.routeId, routeSchedules);
  }
  res.json(routes.map((route) => ({
    ...route,
    buses: busesByRoute.get(route.id) || [],
    busId: busesByRoute.get(route.id)?.[0]?.id || null,
    busNumber: busesByRoute.get(route.id)?.[0]?.busNumber || null,
    schedules: schedulesByRoute.get(route.id) || [],
  })));
});

router.get('/routes/:id/stops', async (req, res) => {
  const [stops] = await pool.query(
    'SELECT * FROM route_stops WHERE route_id = ? ORDER BY sequence ASC',
    [req.params.id]
  );
  res.json(stops);
});

router.get('/buses/:id', async (req, res) => {
  const [buses] = await pool.query(
    `SELECT b.*, COALESCE(NULLIF(r.description, ''), r.name) AS route_name
     FROM buses b LEFT JOIN routes r ON b.route_id = r.id
     WHERE b.id = ?`,
    [req.params.id]
  );
  if (buses.length === 0) return res.status(404).json({ error: 'Bus not found' });

  const bus = buses[0];
  const [stops] = await pool.query(
    'SELECT * FROM route_stops WHERE route_id = ? ORDER BY sequence ASC',
    [bus.route_id]
  );
  res.json({ ...bus, stops });
});

router.get('/buses/:id/community', async (req, res) => {
  const busId = Number(req.params.id);
  if (!Number.isInteger(busId) || busId < 1) {
    return res.status(400).json({ error: 'Invalid bus ID' });
  }

  const [buses] = await pool.query("SELECT id FROM buses WHERE id = ? AND status = 'active'", [busId]);
  if (!buses.length) return res.status(404).json({ error: 'Bus not found' });

  const [[contribution]] = await pool.query(
    `SELECT COUNT(DISTINCT l.user_id) AS verifiedStudents
     FROM locations l
     JOIN users u ON u.id = l.user_id AND u.approval_status = 'approved'
     WHERE l.bus_id = ?`,
    [busId]
  );
  const [comments] = await pool.query(
    `SELECT c.id, c.comment, c.created_at AS createdAt, u.name AS author
     FROM route_comments c JOIN users u ON u.id = c.user_id
     WHERE c.bus_id = ?
     ORDER BY c.created_at DESC LIMIT 50`,
    [busId]
  );

  res.json({ verifiedStudents: contribution.verifiedStudents, comments });
});

router.get('/me/points', verifyToken, async (req, res) => {
  const [rows] = await pool.query('SELECT points FROM student_points WHERE user_id = ?', [req.user.id]);
  res.json({ points: rows[0]?.points || 0 });
});

router.post('/buses/:id/comments', verifyToken, async (req, res) => {
  const busId = Number(req.params.id);
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  const sessionId = Number(req.body?.sessionId);
  const wordCount = comment ? comment.split(/\s+/u).length : 0;

  if (!Number.isInteger(busId) || busId < 1) {
    return res.status(400).json({ error: 'Invalid bus ID' });
  }
  if (!comment || wordCount > 50) {
    return res.status(400).json({ error: 'Comment must contain between 1 and 50 words' });
  }
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
    return res.status(400).json({ error: 'A completed location contribution is required to comment' });
  }

  const [users] = await pool.query(
    "SELECT id, name FROM users WHERE id = ? AND approval_status = 'approved' AND role IN ('rider', 'tracker')",
    [req.user.id]
  );
  if (!users.length) {
    return res.status(403).json({ error: 'An approved student account is required to comment' });
  }

  const [buses] = await pool.query("SELECT id FROM buses WHERE id = ? AND status = 'active'", [busId]);
  if (!buses.length) return res.status(404).json({ error: 'Bus not found' });

  const [sessions] = await pool.query(
    `SELECT id FROM contribution_sessions
     WHERE id = ? AND bus_id = ? AND user_id = ? AND point_awarded = TRUE`,
    [sessionId, busId, req.user.id]
  );
  if (!sessions.length) {
    return res.status(403).json({ error: 'Only the student who contributed GPS in this session can comment' });
  }

  let result;
  try {
    [result] = await pool.query(
      'INSERT INTO route_comments (bus_id, user_id, session_id, comment) VALUES (?, ?, ?, ?)',
      [busId, req.user.id, sessionId, comment]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A comment has already been added for this contribution' });
    }
    throw error;
  }

  res.status(201).json({
    id: result.insertId,
    author: users[0].name,
    comment,
    createdAt: new Date(),
  });
});

router.get('/buses', async (req, res) => {
  const [buses] = await pool.query(
    `SELECT b.*, r.name AS route_name
     FROM buses b LEFT JOIN routes r ON b.route_id = r.id
     WHERE b.status = 'active'`
  );
  res.json(buses);
});

// Admin-only writes

router.post('/routes', verifyToken, requireRole('admin'), async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const busNumber = typeof req.body?.busNumber === 'string' ? req.body.busNumber.trim() : '';
  if (!name || name.length > 100 || description.length > 2000 || !busNumber || busNumber.length > 20) {
    return res.status(400).json({ error: 'Enter a route name (up to 100 characters), itinerary (up to 2000 characters), and bus name (up to 20 characters)' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [routeResult] = await connection.query(
      'INSERT INTO routes (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    await connection.query(
      'INSERT INTO buses (bus_number, route_id) VALUES (?, ?)',
      [busNumber, routeResult.insertId]
    );
    await connection.commit();
    res.status(201).json({
      id: routeResult.insertId,
      name,
      description: description || null,
      busNumber,
      schedules: [],
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Could not create route' });
  } finally {
    connection.release();
  }
});

router.post('/routes/:id/schedules', verifyToken, requireRole('admin'), async (req, res) => {
  const routeId = Number(req.params.id);
  const { departureTime, arrivalTime } = req.body || {};
  const isValidTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!Number.isInteger(routeId) || routeId < 1) {
    return res.status(400).json({ error: 'Invalid route ID' });
  }
  if (!isValidTime(departureTime) || !isValidTime(arrivalTime)) {
    return res.status(400).json({ error: 'Enter valid departure and arrival times' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO route_schedules (route_id, departure_time, arrival_time) VALUES (?, ?, ?)',
      [routeId, departureTime, arrivalTime]
    );
    res.status(201).json({
      id: result.insertId,
      routeId,
      departureTime,
      arrivalTime,
    });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({ error: 'Route not found' });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A bus time already exists for that departure time' });
    }
    throw error;
  }
});

router.patch('/routes/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const routeId = Number(req.params.id);
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  if (!Number.isInteger(routeId) || routeId < 1) {
    return res.status(400).json({ error: 'Invalid route ID' });
  }
  if (!name || name.length > 100 || description.length > 2000) {
    return res.status(400).json({ error: 'Enter a route name up to 100 characters and route details up to 2000 characters' });
  }

  const [result] = await pool.query(
    'UPDATE routes SET name = ?, description = ? WHERE id = ?',
    [name, description || null, routeId]
  );
  if (!result.affectedRows) {
    const [rows] = await pool.query('SELECT id FROM routes WHERE id = ?', [routeId]);
    if (!rows.length) return res.status(404).json({ error: 'Route not found' });
  }
  res.json({ id: routeId, name, description: description || null });
});

router.delete('/routes/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const routeId = Number(req.params.id);
  if (!Number.isInteger(routeId) || routeId < 1) {
    return res.status(400).json({ error: 'Invalid route ID' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [routes] = await connection.query('SELECT id FROM routes WHERE id = ? FOR UPDATE', [routeId]);
    if (!routes.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Route not found' });
    }
    await connection.query('DELETE FROM buses WHERE route_id = ?', [routeId]);
    await connection.query('DELETE FROM routes WHERE id = ?', [routeId]);
    await connection.commit();
    res.json({ id: routeId, deleted: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.patch('/schedules/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const scheduleId = Number(req.params.id);
  const { departureTime, arrivalTime } = req.body || {};
  const isValidTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!Number.isInteger(scheduleId) || scheduleId < 1) {
    return res.status(400).json({ error: 'Invalid schedule ID' });
  }
  if (!isValidTime(departureTime) || !isValidTime(arrivalTime)) {
    return res.status(400).json({ error: 'Enter valid departure and arrival times' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE route_schedules SET departure_time = ?, arrival_time = ? WHERE id = ?',
      [departureTime, arrivalTime, scheduleId]
    );
    if (!result.affectedRows) {
      const [rows] = await pool.query('SELECT id FROM route_schedules WHERE id = ?', [scheduleId]);
      if (!rows.length) return res.status(404).json({ error: 'Bus time not found' });
    }
    res.json({ id: scheduleId, departureTime, arrivalTime });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A bus time already exists for that departure time' });
    }
    throw error;
  }
});

router.delete('/schedules/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const scheduleId = Number(req.params.id);
  if (!Number.isInteger(scheduleId) || scheduleId < 1) {
    return res.status(400).json({ error: 'Invalid schedule ID' });
  }

  const [result] = await pool.query('DELETE FROM route_schedules WHERE id = ?', [scheduleId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Bus time not found' });
  res.json({ id: scheduleId, deleted: true });
});

router.post('/routes/:id/stops', verifyToken, requireRole('admin'), async (req, res) => {
  const { stopName, lat, lng, sequence } = req.body;
  const [result] = await pool.query(
    'INSERT INTO route_stops (route_id, stop_name, lat, lng, sequence) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, stopName, lat, lng, sequence]
  );
  res.status(201).json({ id: result.insertId });
});

router.post('/buses', verifyToken, requireRole('admin'), async (req, res) => {
  const busNumber = typeof req.body?.busNumber === 'string' ? req.body.busNumber.trim() : '';
  const routeId = Number(req.body?.routeId);
  if (!busNumber || busNumber.length > 20) {
    return res.status(400).json({ error: 'Enter a bus name up to 20 characters long' });
  }
  if (!Number.isInteger(routeId) || routeId < 1) {
    return res.status(400).json({ error: 'Select a valid route for this bus' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO buses (bus_number, route_id) VALUES (?, ?)',
      [busNumber, routeId]
    );
    res.status(201).json({ id: result.insertId, busNumber, routeId });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({ error: 'Route not found' });
    }
    throw error;
  }
});

router.patch('/buses/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const busId = Number(req.params.id);
  const busNumber = typeof req.body?.busNumber === 'string' ? req.body.busNumber.trim() : '';
  const routeId = Number(req.body?.routeId);
  if (!Number.isInteger(busId) || busId < 1) {
    return res.status(400).json({ error: 'Invalid bus ID' });
  }
  if (!busNumber || busNumber.length > 20) {
    return res.status(400).json({ error: 'Enter a bus name up to 20 characters long' });
  }
  if (!Number.isInteger(routeId) || routeId < 1) {
    return res.status(400).json({ error: 'Select a valid route for this bus' });
  }

  const [routes] = await pool.query('SELECT id FROM routes WHERE id = ?', [routeId]);
  if (!routes.length) return res.status(404).json({ error: 'Route not found' });
  const [result] = await pool.query(
    'UPDATE buses SET bus_number = ?, route_id = ? WHERE id = ?',
    [busNumber, routeId, busId]
  );
  if (!result.affectedRows) {
    const [rows] = await pool.query('SELECT id FROM buses WHERE id = ?', [busId]);
    if (!rows.length) return res.status(404).json({ error: 'Bus not found' });
  }
  res.json({ id: busId, busNumber, routeId });
});

router.delete('/buses/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const busId = Number(req.params.id);
  if (!Number.isInteger(busId) || busId < 1) {
    return res.status(400).json({ error: 'Invalid bus ID' });
  }

  const [result] = await pool.query('DELETE FROM buses WHERE id = ?', [busId]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Bus not found' });
  res.json({ id: busId, deleted: true });
});

// Assign a verified tracker to a bus (admin-only)
router.post('/buses/:id/trackers', verifyToken, requireRole('admin'), async (req, res) => {
  const { userId } = req.body;
  const [result] = await pool.query(
    'INSERT INTO tracker_assignments (user_id, bus_id) VALUES (?, ?)',
    [userId, req.params.id]
  );
  res.status(201).json({ id: result.insertId });
});

export default router;
