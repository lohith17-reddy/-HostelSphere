// Outpass workflow
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, wardenBlock, audit, notify } = require('../auth');

const router = express.Router();

// list (scoped)
router.get('/', requireAuth, (req, res) => {
  const { status } = req.query;
  let q = `SELECT o.*, u.name student_name, s.block, s.room_no FROM outpasses o JOIN students s ON s.id=o.student_id JOIN users u ON u.id=s.user_id WHERE 1=1`;
  const p = [];
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
    q += ' AND o.student_id=?'; p.push(st.id);
  } else if (req.user.role === 'WARDEN') {
    q += ' AND s.block=?'; p.push(wardenBlock(req));
  }
  if (status) { q += ' AND o.status=?'; p.push(status); }
  q += ' ORDER BY o.created_at DESC LIMIT 500';
  res.json({ success: true, data: db.prepare(q).all(...p) });
});

// student applies
router.post('/', requireAuth, requireRole('STUDENT'), (req, res) => {
  const { reason, destination, out_datetime, return_datetime, parent_contact, emergency } = req.body || {};
  if (!reason || !destination || !out_datetime || !return_datetime)
    return res.status(400).json({ success: false, message: 'reason, destination, out/return datetime required' });
  if (new Date(return_datetime) <= new Date(out_datetime))
    return res.status(400).json({ success: false, message: 'Return must be after out time' });
  const st = db.prepare('SELECT * FROM students WHERE user_id=?').get(req.user.id);
  const r = db.prepare(`INSERT INTO outpasses (student_id, reason, destination, out_datetime, return_datetime, parent_contact, emergency) VALUES (?,?,?,?,?,?,?)`)
    .run(st.id, reason, destination, out_datetime, return_datetime, parent_contact || null, emergency ? 1 : 0);
  const op = db.prepare('SELECT * FROM outpasses WHERE id=?').get(r.lastInsertRowid);
  // notify wardens of block + admins
  const wardens = db.prepare('SELECT user_id FROM wardens WHERE block=?').all(st.block);
  for (const w of wardens) notify(w.user_id, 'New outpass request', `${req.user.name} → ${destination} (${emergency ? 'EMERGENCY' : 'normal'})`, 'outpass');
  const admins = db.prepare(`SELECT id FROM users WHERE role='ADMIN'`).all();
  for (const a of admins) notify(a.id, 'New outpass request', `${req.user.name} (${st.block}) → ${destination}`, 'outpass');
  audit(req.user.id, 'APPLY_OUTPASS', 'outpass', op.id, destination);
  res.json({ success: true, data: op });
});

// approve / reject (warden or admin)
router.post('/:id/decide', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  const { action, remarks } = req.body || {};
  if (!['Approved', 'Rejected'].includes(action)) return res.status(400).json({ success: false, message: 'action must be Approved/Rejected' });
  const op = db.prepare('SELECT * FROM outpasses WHERE id=?').get(req.params.id);
  if (!op) return res.status(404).json({ success: false, message: 'Not found' });
  if (!['Pending'].includes(op.status)) return res.status(400).json({ success: false, message: 'Only Pending can be decided' });
  if (req.user.role === 'WARDEN') {
    const s = db.prepare('SELECT block FROM students WHERE id=?').get(op.student_id);
    if (s.block !== wardenBlock(req)) return res.status(403).json({ success: false, message: 'Not your block' });
  }
  db.prepare(`UPDATE outpasses SET status=?, remarks=?, decided_by=? WHERE id=?`).run(action, remarks || null, req.user.id, op.id);
  const st = db.prepare('SELECT user_id FROM students WHERE id=?').get(op.student_id);
  notify(st.user_id, `Outpass ${action}`, remarks || `Your outpass to ${op.destination} was ${action}`, 'outpass');
  // if approved and out date is today, auto-mark attendance on-outpass
  if (action === 'Approved') {
    const today = new Date().toISOString().slice(0, 10);
    if (op.out_datetime.slice(0, 10) <= today && op.return_datetime.slice(0, 10) >= today) {
      db.prepare(`INSERT INTO attendance (student_id, date, status, marked_by) VALUES (?,?,?,?)
        ON CONFLICT(student_id,date) DO UPDATE SET status='on-outpass'`).run(op.student_id, today, 'on-outpass', req.user.id);
    }
  }
  audit(req.user.id, 'DECIDE_OUTPASS', 'outpass', op.id, action);
  res.json({ success: true, data: db.prepare('SELECT * FROM outpasses WHERE id=?').get(op.id) });
});

// checkout / return
router.post('/:id/checkout', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  const op = db.prepare('SELECT * FROM outpasses WHERE id=?').get(req.params.id);
  if (!op || op.status !== 'Approved') return res.status(400).json({ success: false, message: 'Must be Approved first' });
  db.prepare(`UPDATE outpasses SET status='CheckedOut', checked_out_at=datetime('now') WHERE id=?`).run(op.id);
  audit(req.user.id, 'OUTPASS_CHECKOUT', 'outpass', op.id, '');
  res.json({ success: true, data: db.prepare('SELECT * FROM outpasses WHERE id=?').get(op.id) });
});
router.post('/:id/return', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  const op = db.prepare('SELECT * FROM outpasses WHERE id=?').get(req.params.id);
  if (!op || !['Approved', 'CheckedOut', 'Overdue'].includes(op.status)) return res.status(400).json({ success: false, message: 'Not checked out' });
  const late = new Date() > new Date(op.return_datetime) ? 1 : 0;
  db.prepare(`UPDATE outpasses SET status='Returned', returned_at=datetime('now'), late=? WHERE id=?`).run(late, op.id);
  const st = db.prepare('SELECT user_id FROM students WHERE id=?').get(op.student_id);
  notify(st.user_id, 'Outpass closed', late ? 'Marked returned (LATE)' : 'Welcome back!', 'outpass');
  audit(req.user.id, 'OUTPASS_RETURN', 'outpass', op.id, late ? 'late' : 'on-time');
  res.json({ success: true, data: db.prepare('SELECT * FROM outpasses WHERE id=?').get(op.id) });
});

module.exports = router;
