// Attendance routes
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, wardenBlock, audit, notify } = require('../auth');
const { todayISO } = require('../utils');

const router = express.Router();

// warden: students of my block
router.get('/my-students', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  let rows;
  if (req.user.role === 'WARDEN') {
    rows = db.prepare(`SELECT s.*, u.name, u.email FROM students s JOIN users u ON u.id=s.user_id WHERE s.block=? ORDER BY s.room_no`).all(wardenBlock(req));
  } else {
    const { block } = req.query;
    rows = block
      ? db.prepare(`SELECT s.*, u.name, u.email FROM students s JOIN users u ON u.id=s.user_id WHERE s.block=? ORDER BY s.room_no`).all(block)
      : db.prepare(`SELECT s.*, u.name, u.email FROM students s JOIN users u ON u.id=s.user_id ORDER BY s.block, s.room_no`).all();
  }
  res.json({ success: true, data: rows });
});

// get attendance for a date (+ auto on-outpass)
router.get('/', requireAuth, (req, res) => {
  const date = req.query.date || todayISO();
  let studentIds;
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
    // month view
    const month = (req.query.month || date.slice(0, 7));
    const rows = db.prepare(`SELECT * FROM attendance WHERE student_id=? AND substr(date,1,7)=? ORDER BY date`).all(st.id, month);
    const present = rows.filter(r => r.status === 'present').length;
    const pct = rows.length ? Math.round(present / rows.length * 100) : 0;
    return res.json({ success: true, data: { rows, pct, total: rows.length } });
  }
  if (req.user.role === 'WARDEN') {
    const block = wardenBlock(req);
    const students = db.prepare(`SELECT s.*, u.name FROM students s JOIN users u ON u.id=s.user_id WHERE s.block=? ORDER BY s.room_no`).all(block);
    studentIds = students.map(s => s.id);
  } else {
    const { block } = req.query;
    const students = block
      ? db.prepare(`SELECT s.*, u.name FROM students s JOIN users u ON u.id=s.user_id WHERE s.block=?`).all(block)
      : db.prepare(`SELECT s.*, u.name FROM students s JOIN users u ON u.id=s.user_id`).all();
    // attach attendance
    const out = students.map(s => {
      const a = db.prepare('SELECT * FROM attendance WHERE student_id=? AND date=?').get(s.id, date);
      // auto outpass?
      const op = db.prepare(`SELECT id FROM outpasses WHERE student_id=? AND status IN ('Approved','CheckedOut') AND date(out_datetime)<=date(?) AND date(return_datetime)>=date(?)`).get(s.id, date, date);
      return { ...s, attendance: a ? a.status : (op ? 'on-outpass' : null) };
    });
    return res.json({ success: true, data: out });
  }
  // warden path
  const students = db.prepare(`SELECT s.*, u.name FROM students s JOIN users u ON u.id=s.user_id WHERE s.id IN (${studentIds.map(() => '?').join(',') || '0'})`).all(...studentIds);
  const out = students.map(s => {
    const a = db.prepare('SELECT * FROM attendance WHERE student_id=? AND date=?').get(s.id, date);
    const op = db.prepare(`SELECT id FROM outpasses WHERE student_id=? AND status IN ('Approved','CheckedOut') AND date(out_datetime)<=date(?) AND date(return_datetime)>=date(?)`).get(s.id, date, date);
    return { ...s, attendance: a ? a.status : (op ? 'on-outpass' : null) };
  });
  res.json({ success: true, data: out });
});

// mark attendance (warden/admin) — bulk upsert
router.post('/mark', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  const { date, records } = req.body || {}; // records: [{student_id, status}]
  if (!date || !Array.isArray(records)) return res.status(400).json({ success: false, message: 'date + records required' });
  const block = req.user.role === 'WARDEN' ? wardenBlock(req) : null;
  const stmt = db.prepare(`INSERT INTO attendance (student_id, date, status, marked_by) VALUES (?,?,?,?)
    ON CONFLICT(student_id, date) DO UPDATE SET status=excluded.status, marked_by=excluded.marked_by`);
  let n = 0;
  for (const r of records) {
    if (!['present', 'absent', 'on-leave', 'on-outpass'].includes(r.status)) continue;
    if (block) {
      const s = db.prepare('SELECT block FROM students WHERE id=?').get(r.student_id);
      if (!s || s.block !== block) continue;
    }
    // auto: approved outpass forces on-outpass
    const op = db.prepare(`SELECT id FROM outpasses WHERE student_id=? AND status IN ('Approved','CheckedOut') AND date(out_datetime)<=date(?) AND date(return_datetime)>=date(?)`).get(r.student_id, date, date);
    const status = op ? 'on-outpass' : r.status;
    stmt.run(r.student_id, date, status, req.user.id);
    n++;
  }
  // 3-day absent streak alerts
  const alerts = [];
  const checked = [...new Set(records.map(r => r.student_id))];
  for (const sid of checked) {
    const last3 = db.prepare(`SELECT status FROM attendance WHERE student_id=? ORDER BY date DESC LIMIT 3`).all(sid);
    if (last3.length === 3 && last3.every(r => r.status === 'absent')) {
      const s = db.prepare('SELECT user_id, block FROM students WHERE id=?').get(sid);
      const wardens = db.prepare(`SELECT user_id FROM wardens WHERE block=?`).all(s.block);
      for (const w of wardens) notify(w.user_id, 'Absent 3 days in a row', `Student #${sid} absent 3+ consecutive days`, 'alert');
      alerts.push(sid);
    }
  }
  audit(req.user.id, 'MARK_ATTENDANCE', 'attendance', date, `${n} records`);
  res.json({ success: true, message: `Marked ${n}`, data: { count: n, streakAlerts: alerts } });
});

// report (admin)
router.get('/report', requireAuth, requireRole('ADMIN'), (req, res) => {
  const { from, to, block } = req.query;
  let q = `SELECT a.*, u.name, s.block, s.roll_no FROM attendance a JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id WHERE 1=1`;
  const p = [];
  if (from) { q += ' AND date(a.date)>=date(?)'; p.push(from); }
  if (to) { q += ' AND date(a.date)<=date(?)'; p.push(to); }
  if (block) { q += ' AND s.block=?'; p.push(block); }
  q += ' ORDER BY a.date DESC LIMIT 2000';
  const rows = db.prepare(q).all(...p);
  const total = rows.length;
  const present = rows.filter(r => r.status === 'present').length;
  const byBlock = db.prepare(`SELECT s.block b, COUNT(*) total, SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) present FROM attendance a JOIN students s ON s.id=a.student_id ${from || to ? 'WHERE 1=1' : ''} ${from ? 'AND date(a.date)>=date(?)' : ''} ${to ? 'AND date(a.date)<=date(?)' : ''} GROUP BY b`).all(...[...(from ? [from] : []), ...(to ? [to] : [])]);
  res.json({ success: true, data: { rows, pct: total ? Math.round(present / total * 100) : 0, byBlock } });
});

module.exports = router;
