-- PUST Bus Tracker schema
CREATE DATABASE IF NOT EXISTS bus_tracker CHARACTER SET utf8mb4;
USE bus_tracker;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('rider','tracker','admin') NOT NULL DEFAULT 'rider',
  approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verifications (
  email VARCHAR(255) PRIMARY KEY,
  otp_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  verified_at DATETIME NULL,
  last_sent_at DATETIME NOT NULL,
  INDEX idx_email_verifications_expiry (expires_at)
);

CREATE TABLE IF NOT EXISTS routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS route_stops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  stop_name VARCHAR(100) NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  sequence INT NOT NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS buses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bus_number VARCHAR(20) NOT NULL,
  route_id INT,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tracker_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bus_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
);

-- Only confirmed GPS pings are persisted; predicted/stale positions are derived on the fly.
CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bus_id INT NOT NULL,
  user_id INT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  speed FLOAT DEFAULT 0,
  heading FLOAT DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_bus_recorded (bus_id, recorded_at)
);

CREATE TABLE IF NOT EXISTS contribution_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bus_id INT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  point_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
  INDEX idx_contribution_user_bus (user_id, bus_id, started_at)
);

CREATE TABLE IF NOT EXISTS student_points (
  user_id INT PRIMARY KEY,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS route_comments (
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
);

-- Seed the three university bus routes
INSERT INTO routes (name, description) VALUES
  ('Route R1', 'Campus - Terminal - Meril - Gachpara - Shohor - Court - Ononto - Mujahid Club - Campus'),
  ('Route R2', 'Campus - Terminal - Mujahid Club - Ononto - Court - Shohor - Gachpara - Meril - Campus'),
  ('Route R3', 'Campus - Meril - Gachpara - Tebunia - Ishwardi - Campus');

INSERT INTO route_stops (route_id, stop_name, lat, lng, sequence) VALUES
  (1, 'Campus', 24.1232000, 89.1147000, 1),
  (1, 'Terminal', 24.1219000, 89.1174000, 2),
  (1, 'Meril', 24.1206000, 89.1128000, 3),
  (1, 'Gachpara', 24.1187000, 89.1208000, 4),
  (1, 'Shohor', 24.1175000, 89.1220000, 5),
  (1, 'Court', 24.1165000, 89.1230000, 6),
  (1, 'Ononto', 24.1210000, 89.1170000, 7),
  (1, 'Mujahid Club', 24.1195000, 89.1180000, 8),
  (1, 'Campus', 24.1232000, 89.1147000, 9),
  (2, 'Campus', 24.1232000, 89.1147000, 1),
  (2, 'Terminal', 24.1219000, 89.1174000, 2),
  (2, 'Mujahid Club', 24.1195000, 89.1180000, 3),
  (2, 'Ononto', 24.1210000, 89.1170000, 4),
  (2, 'Court', 24.1165000, 89.1230000, 5),
  (2, 'Shohor', 24.1175000, 89.1220000, 6),
  (2, 'Gachpara', 24.1187000, 89.1208000, 7),
  (2, 'Meril', 24.1206000, 89.1128000, 8),
  (2, 'Campus', 24.1232000, 89.1147000, 9),
  (3, 'Campus', 24.1232000, 89.1147000, 1),
  (3, 'Meril', 24.1206000, 89.1128000, 2),
  (3, 'Gachpara', 24.1187000, 89.1208000, 3),
  (3, 'Tebunia', 24.1150000, 89.1260000, 4),
  (3, 'Ishwardi', 24.1300000, 89.0500000, 5),
  (3, 'Campus', 24.1232000, 89.1147000, 6);

INSERT INTO buses (bus_number, route_id, status) VALUES
  ('Route R1 Bus', 1, 'active'),
  ('Route R2 Bus', 2, 'active'),
  ('Route R3 Bus', 3, 'active');
