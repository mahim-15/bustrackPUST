import express from 'express';
import { pool } from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public reads — the map screen needs these without login

router.get('/routes', async (req, res) => {
  const [routes] = await pool.query('SELECT * FROM routes');
  res.json(routes);
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
    `SELECT b.*, r.name AS route_name
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
  const { name, description } = req.body;
  const [result] = await pool.query(
    'INSERT INTO routes (name, description) VALUES (?, ?)',
    [name, description || null]
  );
  res.status(201).json({ id: result.insertId, name, description });
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
  const { busNumber, routeId } = req.body;
  const [result] = await pool.query(
    'INSERT INTO buses (bus_number, route_id) VALUES (?, ?)',
    [busNumber, routeId || null]
  );
  res.status(201).json({ id: result.insertId });
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
