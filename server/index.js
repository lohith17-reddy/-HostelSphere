// Hostel Management System API — Express + SQLite (zero setup)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('./db'); // init schema

const { requireAuth, requireRole } = require('./auth');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'OK', data: { status: 'up', service: 'hostel-api', version: '1.0.0' } }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/outpass', require('./routes/outpass'));
app.use('/api/mess', require('./routes/mess'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api', require('./routes/extras')); // /api/notices, /api/search, ...

// CSV/PDF-friendly reports (JSON; frontend exports CSV/PDF)
app.get('/api/reports/:kind', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = require('./db');
  const kind = req.params.kind;
  if (kind === 'attendance') return res.json({ success: true, data: db.prepare('SELECT a.*, u.name FROM attendance a JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id ORDER BY a.date DESC LIMIT 2000').all() });
  if (kind === 'fees') return res.json({ success: true, data: db.prepare('SELECT b.*, u.name FROM bills b JOIN users u ON u.id=b.user_id ORDER BY b.created_at DESC LIMIT 2000').all() });
  if (kind === 'mess') return res.json({ success: true, data: db.prepare('SELECT * FROM mess_records ORDER BY date DESC LIMIT 500').all() });
  if (kind === 'complaints') return res.json({ success: true, data: db.prepare('SELECT * FROM complaints ORDER BY created_at DESC LIMIT 500').all() });
  res.status(400).json({ success: false, message: 'Unknown report kind' });
});

// Serve frontend build if present
const clientDist = path.join(__dirname, '..', 'client', 'dist');
try {
  const fs = require('fs');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
} catch {}

// 404 + error handler
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Not found' }));
// eslint-disable-next-line
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error' });
});

module.exports = app;

// Run standalone locally (`node index.js`); on Vercel the exported app is
// used as the serverless handler (see /api/index.js) — do NOT listen there.
if (require.main === module) {
  app.listen(PORT, () => console.log(`Hostel API running on http://localhost:${PORT}`));
}
