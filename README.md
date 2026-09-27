# PUST Bus Tracker

Live university bus tracking with student email verification, community GPS sharing, contribution points, and route comments.

## Requirements

- Node.js 20.19+ or 22.12+
- MySQL 8+
- SMTP credentials for institutional email verification

## Setup

1. Install frontend dependencies from the repository root:

   ```sh
   npm install
   ```

2. Create the database and tables:

   ```sh
   mysql -u root -p < server/schema.sql
   ```

3. Copy `server/.env.example` to `server/.env` and configure MySQL, SMTP, `JWT_SECRET`, and `OTP_SECRET`. Keep `server/.env` private.

4. Install backend dependencies:

   ```sh
   cd server
   npm install
   ```

## Run locally

Start the API and live tracking sockets in one terminal:

```sh
cd server
npm run dev
```

Start the Vite frontend in another terminal from the repository root:

```sh
npm run dev
```

Open the URL printed by Vite. Its development proxy forwards API and Socket.IO traffic to `http://localhost:5000`.

## Checks

```sh
npm run build
npm run lint
cd server
npm test
```

Location sharing requires browser GPS permission and HTTPS outside localhost. Students earn one point per accepted contribution session; only the contributor can post that session's optional comment (up to 50 words).
