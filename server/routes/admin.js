// Admin: dashboard, manage wardens/students/rooms/blocks
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireRole, audit, notify } = require('../auth');
const { isEmail, todayISO } = require('../utils');

const router = express.Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/dashboard', (req, res) => {
  const totalStudents = db.prepare('SELECT COUNT(*) c FROM students').get().c;
  const rooms = db.prepare(`SELECT COUNT(*) total, SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) occ, SUM(CASE WHEN status='vacant' THEN 1 ELSE 0 END) vac FROM rooms`).get();
  const today = todayISO();
  const att = db.prepare("SELECT COUNT(*) t, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) p FROM attendance WHERE date=?").get(today);
  const pendingFees = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(amount+fine),0) amt FROM bills WHERE status IN ('Pending','Overdue')`).get();
  const pendingOut = db.prepare(`SELECT COUNT(*) c FROM outpasses WHERE status='Pending'`).get().c;
  const openComp = db.prepare(`SELECT COUNT(*) c FROM complaints WHERE status != 'Resolved'`).get().c;
  const occupancy = db.prepare(`SELECT block, COUNT(*) total, SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) occ FROM rooms GROUP BY block`).all();
  const feesMonthly = db.prepare(`SELECT substr(paid_at,1,7) m, SUM(amount) total FROM payments GROUP BY m ORDER BY m DESC LIMIT 6`).all().reverse();
  const attTrend = db.prepare(`SELECT date, COUNT(*) t, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) p FROM attendance GROUP BY date ORDER BY date DESC LIMIT 14`).all().reverse();
  const compCat = db.prepare(`SELECT category, COUNT(*) n FROM complaints GROUP BY category`).all();
  res.json({ success: true, data: { totalStudents, rooms, todayAtt: att.t ? Math.round(att.p / att.t * 100) : 0, pendingFees, pendingOut, openComp, occupancy, feesMonthly, attTrend, compCat } });
});

// ---- wardens ----
router.get('/wardens', (req, res) => {
  const rows = db.prepare(`SELECT u.id, u.name, u.email, u.phone, w.block, w.floor FROM users u JOIN wardens w ON w.user_id=u.id ORDER BY w.block`).all();
  res.json({ success: true, data: rows });
});
router.post('/wardens', (req, res) => {
  const { name, email, password = 'Warden@123', phone, block } = req.body || {};
  if (!name || !isEmail(email) || !block) return res.status(400).json({ success: false, message: 'name, email, block required' });
  try {
    const r = db.prepare('INSERT INTO users (email, password_hash, role, name, phone) VALUES (?,?,?,?,?)')
      .run(email.toLowerCase(), bcrypt.hashSync(password, 10), 'WARDEN', name, phone || null);
    db.prepare('INSERT INTO wardens (user_id, block) VALUES (?,?)').run(r.lastInsertRowid, block);
    db.prepare('UPDATE blocks SET warden_user_id=? WHERE name=?').run(r.lastInsertRowid, block);
    audit(req.user.id, 'CREATE_WARDEN', 'user', r.lastInsertRowid, email);
    res.json({ success: true, message: 'Warden created' });
  } catch (e) { res.status(400).json({ success: false, message: 'Email already exists' }); }
});
router.patch('/wardens/:id', (req, res) => {
  const { name, phone, block } = req.body || {};
  if (name) db.prepare('UPDATE users SET name=? WHERE id=?').run(name, req.params.id);
  if (phone) db.prepare('UPDATE users SET phone=? WHERE id=?').run(phone, req.params.id);
  if (block) { db.prepare('UPDATE wardens SET block=? WHERE user_id=?').run(block, req.params.id); }
  res.json({ success: true, message: 'Warden updated' });
});
router.delete('/wardens/:id', (req, res) => {
  db.prepare("DELETE FROM users WHERE id=? AND role='WARDEN'").run(req.params.id);
  res.json({ success: true, message: 'Warden deleted' });
});

// ---- students ----
router.get('/students', (req, res) => {
  const { search = '', block, page = 1, limit = 20 } = req.query;
  const off = (Math.max(1, +page) - 1) * (+limit);
  let q = `SELECT s.*, u.name, u.email, u.phone FROM students s JOIN users u ON u.id=s.user_id WHERE (u.name LIKE ? OR s.roll_no LIKE ? OR u.email LIKE ?)`;
  const p = [`%${search}%`, `%${search}%`, `%${search}%`];
  if (block) { q += ' AND s.block=?'; p.push(block); }
  const total = db.prepare(`SELECT COUNT(*) c FROM (${q})`).get(...p).c;
  const rows = db.prepare(q + ' ORDER BY s.id LIMIT ? OFFSET ?').all(...p, +limit, off);
  res.json({ success: true, data: rows, total, page: +page });
});
router.post('/students', (req, res) => {
  const { name, email, password = 'Student@123', phone, roll_no, department, year, guardian_name, guardian_phone, block, floor, room_no } = req.body || {};
  if (!name || !isEmail(email) || !roll_no || !department || !block) return res.status(400).json({ success: false, message: 'Missing required fields' });
  try {
    const avatar = `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`;
    const r = db.prepare('INSERT INTO users (email, password_hash, role, name, phone, avatar) VALUES (?,?,?,?,?,?)')
      .run(email.toLowerCase(), bcrypt.hashSync(password, 10), 'STUDENT', name, phone || null, avatar);
    let roomId = null;
    if (room_no) {
      const room = db.prepare('SELECT * FROM rooms WHERE block=? AND room_no=?').get(block, room_no);
      if (room) roomId = room.id;
    }
    db.prepare('INSERT INTO students (user_id, roll_no, department, year, guardian_name, guardian_phone, block, floor, room_id, room_no) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(r.lastInsertRowid, roll_no, department, year || 1, guardian_name || null, guardian_phone || null, block, floor || 1, roomId, room_no || null);
    if (roomId) db.prepare(`UPDATE rooms SET occupied = occupied + 1, status=CASE WHEN occupied+1 >= capacity THEN 'occupied' ELSE status END WHERE id=?`).run(roomId);
    audit(req.user.id, 'CREATE_STUDENT', 'user', r.lastInsertRowid, email);
    res.json({ success: true, message: 'Student created' });
  } catch (e) { res.status(400).json({ success: false, message: 'Email or roll number already exists' }); }
});
router.patch('/students/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ success: false, message: 'Not found' });
  const { department, year, guardian_name, guardian_phone, block, floor, room_no } = req.body || {};
  db.prepare('UPDATE students SET department=COALESCE(?,department), year=COALESCE(?,year), guardian_name=COALESCE(?,guardian_name), guardian_phone=COALESCE(?,guardian_phone), block=COALESCE(?,block), floor=COALESCE(?,floor), room_no=COALESCE(?,room_no) WHERE id=?')
    .run(department || null, year || null, guardian_name || null, guardian_phone || null, block || null, floor || null, room_no || null, s.id);
  if (req.body.name || req.body.phone) db.prepare('UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone) WHERE id=?').run(req.body.name || null, req.body.phone || null, s.user_id);
  res.json({ success: true, message: 'Student updated' });
});
router.delete('/students/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ success: false, message: 'Not found' });
  db.prepare('DELETE FROM users WHERE id=?').run(s.user_id);
  res.json({ success: true, message: 'Student deleted' });
});

// ---- rooms / blocks ----
router.get('/rooms', (req, res) => {
  const { block } = req.query;
  const rows = block ? db.prepare('SELECT * FROM rooms WHERE block=? ORDER BY floor, room_no').all(block)
    : db.prepare('SELECT * FROM rooms ORDER BY block, floor, room_no').all();
  res.json({ success: true, data: rows });
});
router.post('/rooms/:id/maintenance', (req, res) => {
  const { status } = req.body || {};
  db.prepare('UPDATE rooms SET status=? WHERE id=?').run(status === 'maintenance' ? 'maintenance' : 'vacant', req.params.id);
  res.json({ success: true, message: 'Room status updated' });
});
router.get('/audit', (req, res) => {
  const rows = db.prepare(`SELECT a.*, u.name actor FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 200`).all();
  res.json({ success: true, data: rows });
});

module.exports = router;
