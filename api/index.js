// Vercel serverless entry — wraps the Express app.
// Vercel's filesystem is read-only except /tmp, so the SQLite DB lives at
// /tmp/hostel.db and is auto-seeded on cold start. Note: /tmp is ephemeral —
// demo data resets when the instance recycles (fine for a demo; use an
// external DB for production persistence).
const fs = require('fs');

process.env.DB_PATH = '/tmp/hostel.db';

const app = require('../server/index.js');

// Seed once per instance (seed.js wipes + rebuilds, so only run when fresh)
if (!fs.existsSync('/tmp/.hostel-seeded')) {
  require('../server/seed.js');
  fs.writeFileSync('/tmp/.hostel-seeded', new Date().toISOString());
}

module.exports = app;
