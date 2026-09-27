import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { pool } from '../db/pool.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
  emailOtpMatches,
  generateEmailOtp,
  getEmailOtpDigest,
  normalizeInstitutionalEmail,
} from '../utils/emailVerification.js';

const router = express.Router();
let emailVerificationTableReady;

async function ensureEmailVerificationTable() {
  if (!emailVerificationTableReady) {
    emailVerificationTableReady = pool.query(
      `CREATE TABLE IF NOT EXISTS email_verifications (
        email VARCHAR(255) PRIMARY KEY,
        otp_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
        verified_at DATETIME NULL,
        last_sent_at DATETIME NOT NULL,
        INDEX idx_email_verifications_expiry (expires_at)
      )`
    ).catch((error) => {
      emailVerificationTableReady = null;
      throw error;
    });
  }
  await emailVerificationTableReady;
}

function getOtpRequestErrorMessage(error) {
  if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    return 'MySQL rejected the credentials. Set DB_USER and DB_PASSWORD in server/.env, then restart the server.';
  }
  if (error.code === 'ER_BAD_DB_ERROR') {
    return 'The configured MySQL database does not exist. Create bus_tracker or set DB_NAME in server/.env.';
  }
  if (error.code === 'ECONNREFUSED') {
    return 'Cannot connect to MySQL. Start the MySQL service and check DB_HOST and DB_PORT in server/.env.';
  }
  if (error.code === 'EAUTH' || error.code === 'EENVELOPE') {
    return 'The mail server rejected the sender or SMTP credentials. Check SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.';
  }
  return 'Could not send the verification code. Check the server configuration and logs.';
}

router.post('/request-otp', async (req, res) => {
  try {
    await ensureEmailVerificationTable();
    const email = normalizeInstitutionalEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: 'Use a valid PUST institutional email address' });
    }

    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length) {
      return res.status(409).json({ error: 'An account already exists for this email' });
    }

    const [verificationRows] = await pool.query(
      'SELECT last_sent_at AS lastSentAt FROM email_verifications WHERE email = ?',
      [email]
    );
    const lastSentAt = verificationRows[0]?.lastSentAt;
    if (lastSentAt && Date.now() - new Date(lastSentAt).getTime() < 60_000) {
      return res.status(429).json({ error: 'Please wait one minute before requesting another code' });
    }

    const otp = generateEmailOtp();
    const otpHash = getEmailOtpDigest(email, otp);
    await pool.query(
      `INSERT INTO email_verifications (email, otp_hash, expires_at, attempts, verified_at, last_sent_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0, NULL, NOW())
       ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash),
         expires_at = VALUES(expires_at), attempts = 0, verified_at = NULL, last_sent_at = NOW()`,
      [email, otpHash]
    );

    const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      await pool.query('DELETE FROM email_verifications WHERE email = ? AND otp_hash = ?', [email, otpHash]);
      return res.status(503).json({ error: 'Email delivery is not configured on the server' });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || SMTP_USER,
        to: email,
        subject: 'Your PUST Bus Tracker verification code',
        text: `Your verification code is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your PUST Bus Tracker verification code is <strong>${otp}</strong>.</p><p>It expires in 10 minutes. If you did not request this code, you can ignore this email.</p>`,
      });
    } catch (error) {
      await pool.query('DELETE FROM email_verifications WHERE email = ? AND otp_hash = ?', [email, otpHash]);
      throw error;
    }

    res.json({ message: 'A verification code has been sent to your institutional email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: getOtpRequestErrorMessage(err) });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    await ensureEmailVerificationTable();
    const email = normalizeInstitutionalEmail(req.body?.email);
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'Enter a valid institutional email and six-digit code' });
    }

    const [rows] = await pool.query(
      `SELECT otp_hash AS otpHash, expires_at AS expiresAt, attempts, verified_at AS verifiedAt
       FROM email_verifications WHERE email = ?`,
      [email]
    );
    const verification = rows[0];
    if (!verification || new Date(verification.expiresAt).getTime() <= Date.now()) {
      return res.status(400).json({ error: 'The code has expired. Request a new one.' });
    }
    if (verification.attempts >= 5) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
    }
    if (!emailOtpMatches(email, otp, verification.otpHash)) {
      await pool.query('UPDATE email_verifications SET attempts = attempts + 1 WHERE email = ?', [email]);
      return res.status(400).json({ error: 'Incorrect verification code' });
    }

    await pool.query('UPDATE email_verifications SET verified_at = NOW() WHERE email = ?', [email]);
    res.json({ verified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not verify the email code' });
  }
});

router.post('/register', async (req, res) => {
  let connection;
  try {
    await ensureEmailVerificationTable();
    const { name, studentId, phone, password } = req.body;
    const email = normalizeInstitutionalEmail(req.body?.email);
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100
      || typeof studentId !== 'string' || !studentId.trim() || studentId.trim().length > 50
      || !email || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'name, studentId, email and password are required' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [verificationRows] = await connection.query(
      `SELECT email FROM email_verifications
       WHERE email = ? AND verified_at IS NOT NULL AND expires_at > NOW()
       FOR UPDATE`,
      [email]
    );
    if (!verificationRows.length) {
      await connection.rollback();
      return res.status(403).json({ error: 'Verify your institutional email before creating an account' });
    }

    const [existing] = await connection.query(
      'SELECT id FROM users WHERE student_id = ? OR email = ?',
      [studentId.trim(), email]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'A student with this ID or institutional email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      'INSERT INTO users (name, student_id, email, phone, password_hash, role, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), studentId.trim(), email, phone || null, passwordHash, 'rider', 'approved']
    );
    await connection.query('UPDATE users SET approved_at = NOW() WHERE id = ?', [result.insertId]);
    await connection.query('DELETE FROM email_verifications WHERE email = ?', [email]);
    await connection.commit();

    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      studentId: studentId.trim(),
      email,
      approvalStatus: 'approved',
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(rollbackError);
      }
    }
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A student with this ID or institutional email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    connection?.release();
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeInstitutionalEmail(req.body?.email);
    const { password } = req.body;
    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const [rows] = await pool.query(
      `SELECT u.*,
         (SELECT GROUP_CONCAT(ta.bus_id)
          FROM tracker_assignments ta
          WHERE ta.user_id = u.id AND ta.active = TRUE) AS trackerBusIds
       FROM users u
       WHERE u.email = ?`,
      [email]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.approval_status !== 'approved') {
      return res.status(403).json({
        error: user.approval_status === 'rejected'
          ? 'Your registration was rejected. Contact the PUST Bus Tracker administrator.'
          : 'Your registration is pending administrator approval.',
      });
    }

    const trackerBusIds = user.trackerBusIds
      ? user.trackerBusIds.split(',').map(Number)
      : [];
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, email: user.email, approvalStatus: user.approval_status, trackerBusIds },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        approvalStatus: user.approval_status,
        trackerBusIds,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/pending', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, student_id AS studentId, email, created_at AS createdAt
       FROM users WHERE approval_status = 'pending' ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load pending registrations' });
  }
});

router.patch('/:id/approval', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }
    await pool.query(
      'UPDATE users SET approval_status = ?, approved_at = IF(? = "approved", CURRENT_TIMESTAMP, NULL) WHERE id = ?',
      [status, status, req.params.id]
    );
    res.json({ id: req.params.id, approvalStatus: status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update registration approval' });
  }
});

export default router;
