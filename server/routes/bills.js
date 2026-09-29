// Bills + payments
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, wardenBlock, audit, notify } = require('../auth');
const { txnId, todayISO } = require('../utils');

const router = express.Router();

// list bills (role-scoped)
router.get('/', requireAuth, (req, res) => {
  const { status, student_id, month, fee_type } = req.query;
  let rows;
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
    rows = db.prepare('SELECT b.*, s.roll_no, u.name FROM bills b JOIN students s ON s.id=b.student_id JOIN users u ON u.id=b.user_id WHERE b.student_id=? ORDER BY b.due_date DESC').all(st.id);
  } else if (req.user.role === 'WARDEN') {
    const block = wardenBlock(req);
    rows = db.prepare(`SELECT b.*, s.roll_no, u.name FROM bills b JOIN students s ON s.id=b.student_id JOIN users u ON u.id=b.user_id WHERE s.block=? ORDER BY b.due_date DESC`).all(block);
  } else {
    let q = `SELECT b.*, s.roll_no, u.name FROM bills b JOIN students s ON s.id=b.student_id JOIN users u ON u.id=b.user_id WHERE 1=1`;
    const p = [];
    if (status) { q += ' AND b.status=?'; p.push(status); }
    if (student_id) { q += ' AND b.student_id=?'; p.push(student_id); }
    if (month) { q += ' AND b.month=?'; p.push(month); }
    if (fee_type) { q += ' AND b.fee_type=?'; p.push(fee_type); }
    q += ' ORDER BY b.due_date DESC LIMIT 1000';
    rows = db.prepare(q).all(...p);
  }
  res.json({ success: true, data: rows });
});

// admin: generate bills for all or selected students
router.post('/generate', requireAuth, requireRole('ADMIN'), (req, res) => {
  const { fee_type, amount, due_date, month, student_ids } = req.body || {};
  if (!fee_type || !amount || !due_date || !month) return res.status(400).json({ success: false, message: 'fee_type, amount, due_date, month required' });
  let students;
  if (Array.isArray(student_ids) && student_ids.length) {
    students = db.prepare(`SELECT * FROM students WHERE id IN (${student_ids.map(() => '?').join(',')})`).all(...student_ids);
  } else {
    students = db.prepare('SELECT * FROM students').all();
  }
  const stmt = db.prepare('INSERT INTO bills (student_id, user_id, fee_type, amount, due_date, month, status) VALUES (?,?,?,?,?,?,?)');
  let n = 0;
  for (const s of students) {
    stmt.run(s.id, s.user_id, fee_type, amount, due_date, month, 'Pending');
    const u = s.user_id;
    notify(u, 'New bill: ' + fee_type, `₹${amount} due ${due_date} (${month})`, 'bill');
    n++;
  }
  audit(req.user.id, 'GENERATE_BILLS', 'bills', month, `${fee_type} x${n}`);
  res.json({ success: true, message: `Generated ${n} bills`, data: { count: n } });
});

// admin: apply late fines to overdue
router.post('/apply-fines', requireAuth, requireRole('ADMIN'), (req, res) => {
  const { fine = 100 } = req.body || {};
  const today = todayISO();
  const overdue = db.prepare(`SELECT * FROM bills WHERE status='Pending' AND date(due_date) < date(?)`).all(today);
  const upd = db.prepare(`UPDATE bills SET fine = fine + ?, status='Overdue' WHERE id=?`);
  for (const b of overdue) { upd.run(fine, b.id); notify(b.user_id, 'Late fine applied', `Bill #${b.id} overdue — fine ₹${fine}`, 'bill'); }
  audit(req.user.id, 'APPLY_FINES', 'bills', null, `fined ${overdue.length}`);
  res.json({ success: true, message: `Fined ${overdue.length} overdue bills`, data: { count: overdue.length } });
});

// admin: reminders
router.post('/remind', requireAuth, requireRole('ADMIN'), (req, res) => {
  const rows = db.prepare(`SELECT * FROM bills WHERE status IN ('Pending','Overdue')`).all();
  for (const b of rows) notify(b.user_id, 'Fee reminder', `Bill #${b.id} (${b.fee_type}) ₹${b.amount + (b.fine || 0)} — ${b.status}`, 'bill');
  audit(req.user.id, 'REMIND_BILLS', 'bills', null, `${rows.length} reminders`);
  res.json({ success: true, message: `Sent ${rows.length} reminders` });
});

// student pays (mock gateway)
router.post('/:id/pay', requireAuth, (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id=?').get(req.params.id);
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
    if (bill.student_id !== st.id) return res.status(403).json({ success: false, message: 'Not your bill' });
  }
  if (req.user.role === 'WARDEN') return res.status(403).json({ success: false, message: 'Wardens have read-only access' });
  if (bill.status === 'Paid') return res.status(400).json({ success: false, message: 'Already paid' });
  const { method = 'UPI' } = req.body || {};
  const total = bill.amount + (bill.fine || 0);
  const tx = txnId('TXN');
  db.prepare('INSERT INTO payments (bill_id, student_id, amount, method, transaction_id) VALUES (?,?,?,?,?)')
    .run(bill.id, bill.student_id, total, method, tx);
  db.prepare(`UPDATE bills SET status='Paid' WHERE id=?`).run(bill.id);
  const pay = db.prepare('SELECT * FROM payments WHERE transaction_id=?').get(tx);
  notify(bill.user_id, 'Payment received', `${bill.fee_type} ₹${total} via ${method} (${tx})`, 'payment');
  audit(req.user.id, 'PAY_BILL', 'bills', bill.id, `${method} ${tx}`);
  res.json({ success: true, data: { ...pay, bill } });
});

// payments list + defaulters + revenue
router.get('/payments/all', requireAuth, requireRole('ADMIN'), (req, res) => {
  const rows = db.prepare(`SELECT p.*, u.name, s.roll_no FROM payments p JOIN students s ON s.id=p.student_id JOIN users u ON u.id=s.user_id ORDER BY p.paid_at DESC LIMIT 500`).all();
  res.json({ success: true, data: rows });
});
router.get('/defaulters', requireAuth, requireRole('ADMIN', 'WARDEN'), (req, res) => {
  let q = `SELECT b.*, u.name, s.roll_no, s.block FROM bills b JOIN students s ON s.id=b.student_id JOIN users u ON u.id=s.user_id WHERE b.status IN ('Pending','Overdue')`;
  const p = [];
  if (req.user.role === 'WARDEN') { q += ' AND s.block=?'; p.push(wardenBlock(req)); }
  q += ' ORDER BY b.due_date ASC LIMIT 500';
  res.json({ success: true, data: db.prepare(q).all(...p) });
});
router.get('/revenue', requireAuth, requireRole('ADMIN'), (req, res) => {
  const monthly = db.prepare(`SELECT substr(paid_at,1,7) m, SUM(amount) total, COUNT(*) n FROM payments GROUP BY m ORDER BY m`).all();
  const byType = db.prepare(`SELECT b.fee_type t, SUM(p.amount) total FROM payments p JOIN bills b ON b.id=p.bill_id GROUP BY t`).all();
  res.json({ success: true, data: { monthly, byType } });
});

module.exports = router;
