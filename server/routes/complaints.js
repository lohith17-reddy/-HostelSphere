// Complaints + compliments
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, wardenBlock, audit, notify } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const { status, category, type } = req.query;
  let q = `SELECT c.*, u.name author FROM complaints c LEFT JOIN users u ON u.id=c.user_id WHERE 1=1`;
  const p = [];
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
    q += ' AND (c.student_id=? OR c.user_id=?)'; p.push(st.id, req.user.id);
  } else if (req.user.role === 'WARDEN') {
    q += ` AND (c.student_id IN (SELECT id FROM students WHERE block=?) OR c.student_id IS NULL)`; p.push(wardenBlock(req));
  }
  if (status) { q += ' AND c.status=?'; p.push(status); }
  if (category) { q += ' AND c.category=?'; p.push(category); }
  if (type) { q += ' AND c.type=?'; p.push(type); }
  q += ' ORDER BY c.created_at DESC LIMIT 500';
  const rows = db.prepare(q).all(...p);
  // auto-escalation flag: open > 3 days
  const now = Date.now();
  const out = rows.map(r => ({
    ...r,
    escalated: r.status !== 'Resolved' && (now - new Date(r.created_at).getTime()) > 3 * 864e5,
    author: r.anonymous && req.user.role === 'STUDENT' ? 'Anonymous' : r.author
  }));
  res.json({ success: true, data: out });
});

router.post('/', requireAuth, requireRole('STUDENT'), (req, res) => {
  const { type = 'complaint', category, description, image, anonymous, priority = 'Medium' } = req.body || {};
  if (!category || !description) return res.status(400).json({ success: false, message: 'category + description required' });
  const st = db.prepare('SELECT * FROM students WHERE user_id=?').get(req.user.id);
  const r = db.prepare(`INSERT INTO complaints (student_id, user_id, type, category, description, image, anonymous, priority) VALUES (?,?,?,?,?,?,?,?)`)
    .run(st.id, req.user.id, type, category, description, image || null, anonymous ? 1 : 0, priority);
  const wardens = db.prepare('SELECT user_id FROM wardens WHERE block=?').all(st.block);
  for (const w of wardens) notify(w.user_id, `New ${type}: ${category}`, description.slice(0, 120), 'complaint');
  audit(req.user.id, 'CREATE_COMPLAINT', 'complaints', r.lastInsertRowid, category);
  res.json({ success: true, data: db.prepare('SELECT * FROM complaints WHERE id=?').get(r.lastInsertRowid) });
});

router.get('/wall', (req, res) => {
  // public wall of appreciation (no auth needed)
  const rows = db.prepare(`SELECT c.*, u.name author FROM complaints c LEFT JOIN users u ON u.id=c.user_id WHERE c.type='compliment' AND c.status='Resolved' ORDER BY c.created_at DESC LIMIT 50`).all();
  res.json({ success: true, data: rows.map(r => ({ ...r, author: r.anonymous ? 'Anonymous' : r.author })) });
});

router.post('/:id/status', requireAuth, requireRole('WARDEN', 'ADMIN'), (req, res) => {
  const { status } = req.body || {};
  if (!['Open', 'In Progress', 'Resolved'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  const c = db.prepare('SELECT * FROM complaints WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Not found' });
  db.prepare(`UPDATE complaints SET status=?, resolved_at=CASE WHEN ?='Resolved' THEN datetime('now') ELSE resolved_at END WHERE id=?`).run(status, status, c.id);
  if (c.user_id) notify(c.user_id, `Complaint ${status}`, `Your ${c.category} ticket is now ${status}`, 'complaint');
  // auto-escalate check: if open >3d notify admins
  audit(req.user.id, 'COMPLAINT_STATUS', 'complaints', c.id, status);
  res.json({ success: true, data: db.prepare('SELECT * FROM complaints WHERE id=?').get(c.id) });
});

router.get('/:id/comments', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT cm.*, u.name, u.role FROM comments cm LEFT JOIN users u ON u.id=cm.user_id WHERE complaint_id=? ORDER BY cm.created_at`).all(req.params.id);
  res.json({ success: true, data: rows });
});
router.post('/:id/comments', requireAuth, (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ success: false, message: 'message required' });
  db.prepare('INSERT INTO comments (complaint_id, user_id, message) VALUES (?,?,?)').run(req.params.id, req.user.id, message);
  const c = db.prepare('SELECT * FROM complaints WHERE id=?').get(req.params.id);
  if (c && c.user_id && c.user_id !== req.user.id) notify(c.user_id, 'New reply on your ticket', message.slice(0, 120), 'complaint');
  res.json({ success: true, message: 'Comment added' });
});

router.post('/:id/rate', requireAuth, requireRole('STUDENT'), (req, res) => {
  const { satisfaction } = req.body || {};
  if (!satisfaction || satisfaction < 1 || satisfaction > 5) return res.status(400).json({ success: false, message: 'satisfaction 1-5 required' });
  db.prepare('UPDATE complaints SET satisfaction=? WHERE id=?').run(satisfaction, req.params.id);
  res.json({ success: true, message: 'Thanks for rating!' });
});

router.get('/analytics/summary', requireAuth, requireRole('ADMIN'), (req, res) => {
  const byCat = db.prepare(`SELECT category, COUNT(*) n FROM complaints GROUP BY category`).all();
  const byStatus = db.prepare(`SELECT status, COUNT(*) n FROM complaints GROUP BY status`).all();
  const avgTime = db.prepare(`SELECT AVG((julianday(resolved_at)-julianday(created_at))) days FROM complaints WHERE status='Resolved'`).get();
  const sat = db.prepare(`SELECT AVG(satisfaction) avg FROM complaints WHERE satisfaction IS NOT NULL`).get();
  res.json({ success: true, data: { byCat, byStatus, avgDays: avgTime.days, satisfaction: sat.avg } });
});

module.exports = router;
