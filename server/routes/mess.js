// Mess: menu, records, feedback, predictor
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, audit } = require('../auth');
const { predictMeal, todayISO } = require('../utils');

const router = express.Router();
const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

router.get('/menu', requireAuth, (req, res) => {
  const { day } = req.query;
  const rows = day
    ? db.prepare('SELECT * FROM mess_menu WHERE day=?').all(day)
    : db.prepare('SELECT * FROM mess_menu ORDER BY rowid').all();
  res.json({ success: true, data: rows });
});
router.post('/menu', requireAuth, requireRole('ADMIN', 'WARDEN'), (req, res) => {
  const { day, meal, items } = req.body || {};
  if (!day || !MEALS.includes(meal) || !items) return res.status(400).json({ success: false, message: 'day, meal, items required' });
  db.prepare(`INSERT INTO mess_menu (day, meal, items) VALUES (?,?,?)
    ON CONFLICT(day, meal) DO UPDATE SET items=excluded.items`).run(day, meal, items);
  audit(req.user.id, 'SET_MENU', 'mess_menu', `${day}-${meal}`, items);
  res.json({ success: true, message: 'Menu saved' });
});

router.get('/records', requireAuth, (req, res) => {
  const { from, to } = req.query;
  let q = 'SELECT * FROM mess_records WHERE 1=1'; const p = [];
  if (from) { q += ' AND date>=?'; p.push(from); }
  if (to) { q += ' AND date<=?'; p.push(to); }
  q += ' ORDER BY date DESC LIMIT 300';
  res.json({ success: true, data: db.prepare(q).all(...p) });
});
router.post('/records', requireAuth, requireRole('ADMIN', 'WARDEN'), (req, res) => {
  const { date, meal, prepared_kg, consumed_kg, eaters } = req.body || {};
  if (!date || !MEALS.includes(meal) || prepared_kg == null || consumed_kg == null || eaters == null)
    return res.status(400).json({ success: false, message: 'date, meal, prepared_kg, consumed_kg, eaters required' });
  const wasted = Math.max(0, Math.round((prepared_kg - consumed_kg) * 100) / 100);
  const cost = Math.round(wasted * 120 * 100) / 100; // ₹120/kg avg
  db.prepare(`INSERT INTO mess_records (date, meal, prepared_kg, consumed_kg, wasted_kg, eaters, cost_waste) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(date, meal) DO UPDATE SET prepared_kg=excluded.prepared_kg, consumed_kg=excluded.consumed_kg, wasted_kg=excluded.wasted_kg, eaters=excluded.eaters, cost_waste=excluded.cost_waste`)
    .run(date, meal, prepared_kg, consumed_kg, wasted, eaters, cost);
  audit(req.user.id, 'MESS_RECORD', 'mess_records', `${date}-${meal}`, `waste ${wasted}kg`);
  res.json({ success: true, data: { wasted_kg: wasted, cost_waste: cost } });
});

// predictor: forecast for a date (default tomorrow)
router.get('/predict', requireAuth, (req, res) => {
  const date = req.query.date || todayISO(1);
  const out = MEALS.map(m => predictMeal(db, date, m));
  res.json({ success: true, data: { date, meals: out } });
});

// dashboard aggregates
router.get('/dashboard', requireAuth, (req, res) => {
  const trend = db.prepare(`SELECT date, SUM(wasted_kg) waste, SUM(cost_waste) cost FROM mess_records GROUP BY date ORDER BY date DESC LIMIT 30`).all().reverse();
  const byMeal = db.prepare(`SELECT meal, AVG(wasted_kg) avgWaste, AVG(eaters) avgEaters FROM mess_records GROUP BY meal`).all();
  const totalWaste = db.prepare(`SELECT SUM(wasted_kg) t, SUM(cost_waste) c FROM mess_records`).get();
  const ratings = db.prepare(`SELECT meal, AVG(rating) avg, COUNT(*) n FROM meal_feedback WHERE rating IS NOT NULL GROUP BY meal`).all();
  const tomorrow = todayISO(1);
  const predictions = MEALS.map(m => predictMeal(db, tomorrow, m));
  res.json({ success: true, data: { trend, byMeal, totalWaste, ratings, predictions, date: tomorrow } });
});

// student: rate / skip
router.post('/feedback', requireAuth, requireRole('STUDENT'), (req, res) => {
  const { date, meal, rating, skipping, comment } = req.body || {};
  if (!date || !MEALS.includes(meal)) return res.status(400).json({ success: false, message: 'date + meal required' });
  const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
  db.prepare(`INSERT INTO meal_feedback (student_id, date, meal, rating, skipping, comment) VALUES (?,?,?,?,?,?)`)
    .run(st.id, date, meal, rating || null, skipping ? 1 : 0, comment || null);
  res.json({ success: true, message: 'Feedback saved' });
});
router.get('/feedback', requireAuth, (req, res) => {
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
    return res.json({ success: true, data: db.prepare('SELECT * FROM meal_feedback WHERE student_id=? ORDER BY date DESC LIMIT 100').all(st.id) });
  }
  res.json({ success: true, data: db.prepare('SELECT * FROM meal_feedback ORDER BY rowid DESC LIMIT 200').all() });
});

module.exports = router;
