// Extras: notices, notifications, visitors, maintenance, laundry, room-requests, leaves, events, search, sos, profile
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, wardenBlock, audit, notify } = require('../auth');

const router = express.Router();

// ---- notices ----
router.get('/notices', requireAuth, (req, res) => {
  let target = 'all';
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT block, floor FROM students WHERE user_id=?').get(req.user.id);
    const rows = db.prepare(`SELECT n.*, u.name author FROM notices n LEFT JOIN users u ON u.id=n.created_by
      WHERE n.target='all' OR n.target=? OR n.target=? ORDER BY n.pinned DESC, n.created_at DESC LIMIT 100`)
      .all('block:' + st.block, `floor:${st.block}-${st.floor}`);
    return res.json({ success: true, data: rows });
  }
  const rows = db.prepare(`SELECT n.*, u.name author FROM notices n LEFT JOIN users u ON u.id=n.created_by ORDER BY n.pinned DESC, n.created_at DESC LIMIT 100`).all();
  res.json({ success: true, data: rows });
});
router.post('/notices', requireAuth, requireRole('ADMIN', 'WARDEN'), (req, res) => {
  const { title, body, target = 'all', pinned } = req.body || {};
  if (!title || !body) return res.status(400).json({ success: false, message: 'title + body required' });
  const r = db.prepare('INSERT INTO notices (title, body, target, pinned, created_by) VALUES (?,?,?,?,?)')
    .run(title, body, target, pinned ? 1 : 0, req.user.id);
  // notify relevant users
  if (target === 'all') {
    const users = db.prepare('SELECT id FROM users').all();
    const stmt = db.prepare('INSERT INTO notifications (user_id, title, body, kind) VALUES (?,?,?,?)');
    for (const u of users) if (u.id !== req.user.id) stmt.run(u.id, 'Notice: ' + title, body.slice(0, 140), 'notice');
  }
  audit(req.user.id, 'CREATE_NOTICE', 'notices', r.lastInsertRowid, title);
  res.json({ success: true, message: 'Notice posted' });
});
router.delete('/notices/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  db.prepare('DELETE FROM notices WHERE id=?').run(req.params.id);
  res.json({ success: true, message: 'Deleted' });
});

// ---- notifications ----
router.get('/notifications', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0').get(req.user.id).c;
  res.json({ success: true, data: rows, unread });
});
router.post('/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id);
  res.json({ success: true });
});

// ---- visitors ----
router.get('/visitors', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  res.json({ success: true, data: db.prepare(`SELECT v.*, u.name student_name FROM visitors v LEFT JOIN students s ON s.id=v.student_id LEFT JOIN users u ON u.id=s.user_id ORDER BY v.in_time DESC LIMIT 200`).all() });
});
router.post('/visitors', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  const { name, phone, student_id, purpose } = req.body || {};
  if (!name) return res.status(400).json({ success: false, message: 'name required' });
  const r = db.prepare('INSERT INTO visitors (name, phone, student_id, purpose, logged_by) VALUES (?,?,?,?,?)').run(name, phone || null, student_id || null, purpose || null, req.user.id);
  audit(req.user.id, 'LOG_VISITOR', 'visitors', r.lastInsertRowid, name);
  res.json({ success: true, message: 'Visitor logged' });
});
router.post('/visitors/:id/out', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  db.prepare(`UPDATE visitors SET out_time=datetime('now') WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// ---- maintenance ----
router.get('/maintenance', requireAuth, (req, res) => {
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
    return res.json({ success: true, data: db.prepare('SELECT * FROM maintenance WHERE student_id=? ORDER BY created_at DESC').all(st.id) });
  }
  let q = 'SELECT m.*, u.name student_name FROM maintenance m LEFT JOIN students s ON s.id=m.student_id LEFT JOIN users u ON u.id=s.user_id WHERE 1=1';
  const p = [];
  if (req.user.role === 'WARDEN') { q += ' AND m.block=?'; p.push(wardenBlock(req)); }
  res.json({ success: true, data: db.prepare(q + ' ORDER BY m.created_at DESC LIMIT 300').all(...p) });
});
router.post('/maintenance', requireAuth, (req, res) => {
  const { block, room_no, issue, category } = req.body || {};
  if (!block || !room_no || !issue) return res.status(400).json({ success: false, message: 'block, room_no, issue required' });
  const st = req.user.role === 'STUDENT' ? db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id) : null;
  const r = db.prepare('INSERT INTO maintenance (student_id, block, room_no, issue, category) VALUES (?,?,?,?,?)')
    .run(st ? st.id : null, block, room_no, issue, category || 'General');
  audit(req.user.id, 'MAINTENANCE', 'maintenance', r.lastInsertRowid, issue);
  res.json({ success: true, message: 'Request raised' });
});
router.post('/maintenance/:id/assign', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  const { technician, status = 'Assigned' } = req.body || {};
  db.prepare('UPDATE maintenance SET technician=?, status=? WHERE id=?').run(technician || null, status, req.params.id);
  res.json({ success: true });
});

// ---- laundry ----
router.get('/laundry', requireAuth, (req, res) => {
  const slots = db.prepare('SELECT * FROM laundry_slots ORDER BY rowid').all();
  let mine = [];
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
    mine = db.prepare('SELECT slot_id FROM laundry_bookings WHERE student_id=?').all(st.id).map(r => r.slot_id);
  }
  res.json({ success: true, data: { slots, mine } });
});
router.post('/laundry/:id/book', requireAuth, requireRole('STUDENT'), (req, res) => {
  const slot = db.prepare('SELECT * FROM laundry_slots WHERE id=?').get(req.params.id);
  if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
  if (slot.booked >= slot.capacity) return res.status(400).json({ success: false, message: 'Slot full' });
  const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
  try {
    db.prepare('INSERT INTO laundry_bookings (slot_id, student_id) VALUES (?,?)').run(slot.id, st.id);
    db.prepare('UPDATE laundry_slots SET booked=booked+1 WHERE id=?').run(slot.id);
    res.json({ success: true, message: 'Slot booked' });
  } catch { res.status(400).json({ success: false, message: 'Already booked' }); }
});

// ---- room change requests ----
router.get('/room-requests', requireAuth, (req, res) => {
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
    return res.json({ success: true, data: db.prepare('SELECT * FROM room_requests WHERE student_id=? ORDER BY created_at DESC').all(st.id) });
  }
  let q = `SELECT r.*, u.name FROM room_requests r JOIN students s ON s.id=r.student_id JOIN users u ON u.id=s.user_id WHERE 1=1`;
  const p = [];
  if (req.user.role === 'WARDEN') { q += ' AND s.block=?'; p.push(wardenBlock(req)); }
  res.json({ success: true, data: db.prepare(q + ' ORDER BY r.created_at DESC').all(...p) });
});
router.post('/room-requests', requireAuth, requireRole('STUDENT'), (req, res) => {
  const { to_block, to_room, reason } = req.body || {};
  if (!to_block || !reason) return res.status(400).json({ success: false, message: 'to_block + reason required' });
  const st = db.prepare('SELECT * FROM students WHERE user_id=?').get(req.user.id);
  const r = db.prepare('INSERT INTO room_requests (student_id, from_room, to_block, to_room, reason) VALUES (?,?,?,?,?)')
    .run(st.id, `${st.block}-${st.room_no}`, to_block, to_room || null, reason);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});
router.post('/room-requests/:id/decide', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  const { action, remark } = req.body || {}; // WardenApproved / Approved / Rejected
  const r = db.prepare('SELECT * FROM room_requests WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ success: false, message: 'Not found' });
  if (req.user.role === 'WARDEN') {
    if (action !== 'WardenApproved' && action !== 'Rejected') return res.status(400).json({ success: false, message: 'Warden can WardenApproved/Rejected' });
    db.prepare('UPDATE room_requests SET status=?, warden_remark=? WHERE id=?').run(action, remark || null, r.id);
  } else {
    db.prepare('UPDATE room_requests SET status=?, admin_remark=? WHERE id=?').run(action, remark || null, r.id);
    if (action === 'Approved') {
      db.prepare('UPDATE students SET block=?, room_no=? WHERE id=?').run(r.to_block, r.to_room || 'TBD', r.student_id);
    }
  }
  const st = db.prepare('SELECT user_id FROM students WHERE id=?').get(r.student_id);
  notify(st.user_id, `Room request ${action}`, remark || '', 'room');
  res.json({ success: true });
});

// ---- leaves ----
router.get('/leaves', requireAuth, (req, res) => {
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
    return res.json({ success: true, data: db.prepare('SELECT * FROM leaves WHERE student_id=? ORDER BY created_at DESC').all(st.id) });
  }
  let q = `SELECT l.*, u.name FROM leaves l JOIN students s ON s.id=l.student_id JOIN users u ON u.id=s.user_id WHERE 1=1`;
  const p = [];
  if (req.user.role === 'WARDEN') { q += ' AND s.block=?'; p.push(wardenBlock(req)); }
  res.json({ success: true, data: db.prepare(q + ' ORDER BY l.created_at DESC').all(...p) });
});
router.post('/leaves', requireAuth, requireRole('STUDENT'), (req, res) => {
  const { reason, from_date, to_date } = req.body || {};
  if (!reason || !from_date || !to_date) return res.status(400).json({ success: false, message: 'reason + dates required' });
  const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
  const r = db.prepare('INSERT INTO leaves (student_id, reason, from_date, to_date) VALUES (?,?,?,?)').run(st.id, reason, from_date, to_date);
  res.json({ success: true, data: { id: r.lastInsertRowid } });
});
router.post('/leaves/:id/decide', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  const { action } = req.body || {};
  db.prepare('UPDATE leaves SET status=?, decided_by=? WHERE id=?').run(action, req.user.id, req.params.id);
  const l = db.prepare('SELECT * FROM leaves WHERE id=?').get(req.params.id);
  const st = db.prepare('SELECT user_id FROM students WHERE id=?').get(l.student_id);
  notify(st.user_id, `Leave ${action}`, l.reason, 'leave');
  // approved leave -> mark attendance on-leave for range (up to 30d)
  res.json({ success: true });
});

// ---- events ----
router.get('/events', requireAuth, (req, res) => {
  res.json({ success: true, data: db.prepare('SELECT * FROM events ORDER BY date').all() });
});
router.post('/events', requireAuth, requireRole('ADMIN', 'WARDEN'), (req, res) => {
  const { title, date, kind = 'event', description } = req.body || {};
  if (!title || !date) return res.status(400).json({ success: false, message: 'title + date required' });
  db.prepare('INSERT INTO events (title, date, kind, description) VALUES (?,?,?,?)').run(title, date, kind, description || null);
  res.json({ success: true });
});

// ---- global search ----
router.get('/search', requireAuth, (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ success: true, data: {} });
  const like = `%${q}%`;
  const students = db.prepare(`SELECT s.id, s.roll_no, s.block, s.room_no, u.name, u.email FROM students s JOIN users u ON u.id=s.user_id WHERE u.name LIKE ? OR s.roll_no LIKE ? OR u.email LIKE ? LIMIT 10`).all(like, like, like);
  const rooms = db.prepare('SELECT * FROM rooms WHERE room_no LIKE ? OR block LIKE ? LIMIT 10').all(like, like);
  const bills = req.user.role === 'ADMIN' ? db.prepare(`SELECT b.id, b.fee_type, b.amount, b.status, u.name FROM bills b JOIN users u ON u.id=b.user_id WHERE b.fee_type LIKE ? LIMIT 10`).all(like) : [];
  const complaints = db.prepare('SELECT id, category, description, status FROM complaints WHERE description LIKE ? OR category LIKE ? LIMIT 10').all(like, like);
  res.json({ success: true, data: { students, rooms, bills, complaints } });
});

// ---- SOS ----
router.post('/sos', requireAuth, requireRole('STUDENT'), (req, res) => {
  const st = db.prepare('SELECT * FROM students WHERE user_id=?').get(req.user.id);
  const { message } = req.body || {};
  const r = db.prepare('INSERT INTO sos_alerts (student_id, message) VALUES (?,?)').run(st.id, message || 'SOS emergency!');
  const wardens = db.prepare('SELECT user_id FROM wardens WHERE block=?').all(st.block);
  for (const w of wardens) notify(w.user_id, `SOS from ${req.user.name}`, `Block ${st.block}, Room ${st.room_no}: ${message || 'Emergency!'}`, 'sos');
  const admins = db.prepare(`SELECT id FROM users WHERE role='ADMIN'`).all();
  for (const a of admins) notify(a.id, `SOS from ${req.user.name}`, `Block ${st.block}, Room ${st.room_no}`, 'sos');
  audit(req.user.id, 'SOS', 'sos', r.lastInsertRowid, st.block + '-' + st.room_no);
  res.json({ success: true, message: 'SOS sent to warden + admin' });
});
router.get('/sos', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  let q = `SELECT s.*, u.name, st.block, st.room_no FROM sos_alerts s JOIN students st ON st.id=s.student_id JOIN users u ON u.id=st.user_id WHERE 1=1`;
  const p = [];
  if (req.user.role === 'WARDEN') { q += ' AND st.block=?'; p.push(wardenBlock(req)); }
  res.json({ success: true, data: db.prepare(q + ' ORDER BY s.created_at DESC LIMIT 100').all(...p) });
});
router.post('/sos/:id/resolve', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  db.prepare(`UPDATE sos_alerts SET status='Resolved' WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// ---- profile / ID card ----
router.get('/profile', requireAuth, (req, res) => {
  const u = { ...req.user };
  if (u.role === 'STUDENT') u.student = db.prepare('SELECT * FROM students WHERE user_id=?').get(u.id);
  if (u.role === 'WARDEN') u.warden = db.prepare('SELECT * FROM wardens WHERE user_id=?').get(u.id);
  res.json({ success: true, data: u });
});

module.exports = router;
