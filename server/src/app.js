import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

import { pool } from './db/pool.js';
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/routes.js';
import { registerTrackingSockets } from './sockets/tracking.js';

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',');

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins },
});

registerTrackingSockets(io);

const port = process.env.PORT || 5000;

async function startServer() {
  const [locationColumns] = await pool.query("SHOW COLUMNS FROM locations LIKE 'user_id'");
  if (locationColumns.length === 0) {
    await pool.query(
      'ALTER TABLE locations ADD COLUMN user_id INT NULL, ADD CONSTRAINT fk_locations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL'
    );
  }
  await pool.query(
    `CREATE TABLE IF NOT EXISTS contribution_sessions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      bus_id INT NOT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      point_awarded BOOLEAN NOT NULL DEFAULT FALSE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
      INDEX idx_contribution_user_bus (user_id, bus_id, started_at)
    )`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS student_points (
      user_id INT PRIMARY KEY,
      points INT UNSIGNED NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS route_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bus_id INT NOT NULL,
      user_id INT NOT NULL,
      session_id BIGINT NULL,
      comment VARCHAR(1000) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (session_id) REFERENCES contribution_sessions(id) ON DELETE SET NULL,
      UNIQUE KEY uq_route_comments_session (session_id),
      INDEX idx_route_comments (bus_id, created_at)
    )`
  );
  const [commentColumns] = await pool.query("SHOW COLUMNS FROM route_comments LIKE 'session_id'");
  if (commentColumns.length === 0) {
    await pool.query('ALTER TABLE route_comments ADD COLUMN session_id BIGINT NULL');
  }
  const [commentIndexes] = await pool.query("SHOW INDEX FROM route_comments WHERE Key_name = 'uq_route_comments_session'");
  if (commentIndexes.length === 0) {
    await pool.query('CREATE UNIQUE INDEX uq_route_comments_session ON route_comments (session_id)');
  }
  const [sessionForeignKeys] = await pool.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'route_comments'
       AND COLUMN_NAME = 'session_id' AND REFERENCED_TABLE_NAME = 'contribution_sessions'`
  );
  if (sessionForeignKeys.length === 0) {
    await pool.query(
      'ALTER TABLE route_comments ADD CONSTRAINT fk_route_comments_session FOREIGN KEY (session_id) REFERENCES contribution_sessions(id) ON DELETE SET NULL'
    );
  }
  server.listen(port, () => {
    console.log(`Bus tracker API + sockets listening on :${port}`);
  });
}

startServer().catch((error) => {
  console.error('Could not initialize the bus tracker database', error);
  process.exitCode = 1;
});
