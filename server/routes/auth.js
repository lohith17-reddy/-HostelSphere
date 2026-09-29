// Auth routes: login, me, change password, forgot (mock)
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth, audit } = require('../auth');
const { isEmail } = require('../utils');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!isEmail(email) || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const token = signToken(user);
  audit(user.id, 'LOGIN', 'user', user.id, user.email);
  const { password_hash, ...safe } = user;
  // enrich with profile ids
  if (safe.role === 'STUDENT') safe.student = db.prepare('SELECT * FROM students WHERE user_id=?').get(safe.id) || null;
  if (safe.role === 'WARDEN') safe.warden = db.prepare('SELECT * FROM wardens WHERE user_id=?').get(safe.id) || null;
  res.json({ success: true, data: { token, user: safe } });
});

router.get('/me', requireAuth, (req, res) => {
  const u = { ...req.user };
  if (u.role === 'STUDENT') u.student = db.prepare('SELECT * FROM students WHERE user_id=?').get(u.id) || null;
  if (u.role === 'WARDEN') u.warden = db.prepare('SELECT * FROM wardens WHERE user_id=?').get(u.id) || null;
  res.json({ success: true, data: u });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword || newPassword.length < 8)
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
  const full = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, full.password_hash))
    return res.status(400).json({ success: false, message: 'Old password is incorrect' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  audit(req.user.id, 'CHANGE_PASSWORD', 'user', req.user.id, '');
  res.json({ success: true, message: 'Password changed' });
});

// Mock forgot-password: always "succeeds" and returns a demo reset hint
router.post('/forgot-password', (req, res) => {
  const { email } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ success: false, message: 'Valid email required' });
  const user = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
  audit(user ? user.id : null, 'FORGOT_PASSWORD', 'user', email, 'mock reset link sent');
  res.json({ success: true, message: 'If this email exists, a reset link was sent (demo: use Student@123 / Warden@123 / Admin@123).' });
});

router.post('/logout', requireAuth, (req, res) => {
  audit(req.user.id, 'LOGOUT', 'user', req.user.id, '');
  res.json({ success: true, message: 'Logged out (client discards token)' });
});

module.exports = router;
