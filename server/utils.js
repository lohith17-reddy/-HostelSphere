// Shared helpers: validation, predictor, txn ids
function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function nowISO() {
  return new Date().toISOString();
}
function txnId(prefix = 'TXN') {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 7).toUpperCase();
}
function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * FOOD WASTAGE PREDICTOR
 * ----------------------
 * Forecasts eaters + recommended cooking quantity per meal using:
 *  - 14-day moving average of eaters for that meal (baseline)
 *  - day-of-week factor (weekends lower)
 *  - holiday/event factor (0.55x on holidays)
 *  - outpass/leave deduction (approved outpasses + leaves covering target date)
 *  - attendance factor (yesterday's present % scales demand)
 *  - menu popularity: high historical waste ratio -> cook slightly less
 *  - advance "skipping" feedback count for target date
 * Formula is a transparent linear blend (documented, no black box).
 */
function predictMeal(db, targetDate, meal) {
  const dayOfWeek = new Date(targetDate + 'T00:00:00').getDay(); // 0 Sun
  // 14-day history for this meal
  const hist = db.prepare(`
    SELECT eaters, prepared_kg, consumed_kg, wasted_kg FROM mess_records
    WHERE meal = ? AND date < ? ORDER BY date DESC LIMIT 14`).all(meal, targetDate);
  let base = hist.length ? hist.reduce((a, r) => a + r.eaters, 0) / hist.length : 50;
  // per-kg consumption rate
  const avgPerPerson = hist.length
    ? hist.reduce((a, r) => a + (r.eaters ? r.consumed_kg / r.eaters : 0.35), 0) / hist.length
    : 0.35;
  // waste ratio -> popularity penalty
  const wasteRatio = hist.length
    ? hist.reduce((a, r) => a + (r.prepared_kg ? r.wasted_kg / r.prepared_kg : 0), 0) / hist.length
    : 0.12;
  // day of week factor
  let dowFactor = 1.0;
  if (dayOfWeek === 0) dowFactor = 0.82;
  else if (dayOfWeek === 6) dowFactor = 0.9;
  else if (dayOfWeek === 5) dowFactor = 0.95;
  // holiday?
  const ev = db.prepare(`SELECT * FROM events WHERE date = ?`).get(targetDate);
  const holidayFactor = ev && ev.kind === 'holiday' ? 0.55 : 1.0;
  // outpass / leave deductions
  const outCount = db.prepare(`SELECT COUNT(*) c FROM outpasses WHERE status IN ('Approved','CheckedOut') AND date(out_datetime) <= date(?) AND date(return_datetime) >= date(?)`).get(targetDate, targetDate).c || 0;
  const leaveCount = db.prepare(`SELECT COUNT(*) c FROM leaves WHERE status='Approved' AND date(from_date) <= date(?) AND date(to_date) >= date(?)`).get(targetDate, targetDate).c || 0;
  // yesterday attendance present ratio
  const y = new Date(targetDate + 'T00:00:00'); y.setDate(y.getDate() - 1);
  const yISO = y.toISOString().slice(0, 10);
  const att = db.prepare(`SELECT COUNT(*) total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) present FROM attendance WHERE date=?`).get(yISO);
  let attFactor = 1.0;
  if (att && att.total > 5) attFactor = 0.6 + 0.4 * (att.present / att.total);
  // skipping feedback
  const skip = db.prepare(`SELECT COUNT(*) c FROM meal_feedback WHERE date=? AND meal=? AND skipping=1`).get(targetDate, meal).c || 0;

  let predicted = base * dowFactor * holidayFactor * attFactor - (outCount + leaveCount) * 0.9 - skip;
  // popularity adjustment: if waste ratio high, trim 5-10%
  predicted = predicted * (1 - Math.min(0.12, wasteRatio * 0.4));
  const totalStudents = db.prepare(`SELECT COUNT(*) c FROM students`).get().c || 60;
  predicted = Math.max(5, Math.min(totalStudents, Math.round(predicted)));
  const recommendedKg = Math.round(predicted * avgPerPerson * 1.05 * 100) / 100; // 5% buffer
  let risk = 'green';
  if (wasteRatio > 0.18 || predicted < base * 0.7) risk = 'red';
  else if (wasteRatio > 0.12 || predicted < base * 0.85) risk = 'yellow';
  return {
    date: targetDate, meal, predictedEaters: predicted, recommendedKg,
    perPersonKg: Math.round(avgPerPerson * 1000) / 1000,
    factors: { baseEaters: Math.round(base), dowFactor, holidayFactor, attFactor: Math.round(attFactor * 100) / 100, outCount, leaveCount, skipping: skip, wasteRatio: Math.round(wasteRatio * 1000) / 1000 },
    risk
  };
}

module.exports = { todayISO, nowISO, txnId, isEmail, predictMeal };
