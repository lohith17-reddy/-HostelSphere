// Seed demo data — idempotent (wipes + rebuilds). Run: npm run seed
const bcrypt = require('bcryptjs');
const db = require('./db');

// deterministic RNG
let seed = 42;
function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
function pad(n, l = 2) { return String(n).padStart(l, '0'); }
function iso(d) { return d.toISOString().slice(0, 10); }

const FIRST = ['Aarav','Vihaan','Arjun','Sai','Reyansh','Krishna','Ishaan','Rohan','Aditya','Kabir','Ananya','Diya','Aadhya','Myra','Sara','Ira','Priya','Sneha','Kavya','Riya','Aryan','Vivaan','Atharv','Sahil','Nikhil','Varun','Karan','Manav','Dev','Yash','Pooja','Neha','Simran','Tanvi','Shreya','Anjali','Rahul','Amit','Suresh','Deepak','Raj','Vikram','Imran','Farhan','Zoya','Fatima','Ayesha','Karthik','Divya','Lakshmi','Meera','Nandini','Harsh','Gaurav','Pranav','Shubham','Ritika','Payal','Sanjana','Komal'];
const LAST = ['Sharma','Verma','Patel','Iyer','Reddy','Nair','Gupta','Mehta','Khan','Singh','Yadav','Mishra','Das','Kulkarni','Joshi','Agarwal','Chopra','Bose','Menon','Pillai','Rao','Kumar','Pandey','Tiwari','Dubey','Chauhan','Rathore','Jain','Bansal','Ghosh'];
const DEPTS = ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT'];
const BLOCKS = ['A', 'B', 'C', 'D', 'E'];

function wipe() {
  const tables = ['audit_logs','sos_alerts','events','leaves','room_requests','laundry_bookings','laundry_slots','maintenance','visitors','notifications','notices','comments','complaints','meal_feedback','mess_records','mess_menu','outpasses','attendance','payments','bills','students','rooms','blocks','wardens','users'];
  db.exec('PRAGMA foreign_keys = OFF');
  for (const t of tables) { try { db.exec(`DELETE FROM ${t}`); } catch {} }
  db.exec('PRAGMA foreign_keys = ON');
}

function run() {
  wipe();
  const adminPass = bcrypt.hashSync('Admin@123', 10);
  const wardenPass = bcrypt.hashSync('Warden@123', 10);
  const studentPass = bcrypt.hashSync('Student@123', 10);

  // admin
  const adminId = db.prepare(`INSERT INTO users (email, password_hash, role, name, phone, avatar) VALUES (?,?,?,?,?,?)`)
    .run('admin@hostel.com', adminPass, 'ADMIN', 'Rajesh Khanna', '9876500000', 'https://i.pravatar.cc/150?u=admin').lastInsertRowid;

  // blocks
  for (const b of BLOCKS) db.prepare('INSERT INTO blocks (name, floors) VALUES (?,?)').run('Block ' + b, 3);

  // wardens (5, one per block)
  const wardenNames = ['Anita Desai', 'Vikram Malhotra', 'Sunita Rao', 'Mohammed Farooq', 'Lakshmi Venkat'];
  const wardenIds = [];
  BLOCKS.forEach((b, i) => {
    const email = `warden${i + 1}@hostel.com`;
    const uid = db.prepare('INSERT INTO users (email, password_hash, role, name, phone) VALUES (?,?,?,?,?)')
      .run(email, wardenPass, 'WARDEN', wardenNames[i], `98765000${10 + i}`).lastInsertRowid;
    db.prepare('INSERT INTO wardens (user_id, block) VALUES (?,?)').run(uid, b);
    db.prepare('UPDATE blocks SET warden_user_id=? WHERE name=?').run(uid, 'Block ' + b);
    wardenIds.push(uid);
  });

  // rooms: 5 blocks x 3 floors x 4 rooms = 60 rooms, cap 3
  let roomSeq = 101;
  const rooms = [];
  for (const b of BLOCKS) {
    for (let f = 1; f <= 3; f++) {
      for (let k = 0; k < 4; k++) {
        const room_no = `${f}${pad(roomSeq % 100)}`.slice(-3);
        const r = db.prepare('INSERT INTO rooms (block, floor, room_no, capacity, occupied, status) VALUES (?,?,?,?,?,?)')
          .run(b, f, room_no, 3, 0, 'vacant');
        rooms.push({ id: r.lastInsertRowid, block: b, floor: f, room_no });
        roomSeq++;
      }
    }
  }
  // one room under maintenance
  db.prepare(`UPDATE rooms SET status='maintenance' WHERE block='C' AND floor=2`).run();

  // students: 58
  const usedEmails = new Set(), usedRoll = new Set();
  const studentRows = [];
  const roomsByBlock = {};
  for (const r of rooms) { (roomsByBlock[r.block] = roomsByBlock[r.block] || []).push(r); }
  const roomCursor = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  const roomOcc = {};
  for (let i = 1; i <= 58; i++) {
    const fn = FIRST[(i * 7 + 3) % FIRST.length], ln = LAST[(i * 13 + 5) % LAST.length];
    const name = `${fn} ${ln}`;
    const email = `student${i}@hostel.com`;
    const roll = `HST2023${pad(i, 3)}`;
    const dept = DEPTS[i % DEPTS.length];
    const year = 1 + (i % 4);
    const block = BLOCKS[i % 5];
    // assign room round-robin with capacity 3
    let room = null;
    const list = roomsByBlock[block];
    for (let t = 0; t < list.length; t++) {
      const c = list[(roomCursor[block] + t) % list.length];
      if ((roomOcc[c.id] || 0) < 3) { room = c; roomCursor[block] = (roomCursor[block] + t + 1) % list.length; break; }
    }
    roomOcc[room.id] = (roomOcc[room.id] || 0) + 1;
    const floor = room.floor;
    const avatar = `https://i.pravatar.cc/150?u=${email}`;
    const uid = db.prepare('INSERT INTO users (email, password_hash, role, name, phone, avatar) VALUES (?,?,?,?,?,?)')
      .run(email, studentPass, 'STUDENT', name, `98${String(10000000 + i * 137331).slice(0, 8)}`, avatar).lastInsertRowid;
    const sid = db.prepare('INSERT INTO students (user_id, roll_no, department, year, guardian_name, guardian_phone, block, floor, room_id, room_no) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(uid, roll, dept, year, `${pick(LAST)} ${pick(['Kumar', 'Devi', 'Singh'])}`, `98${String(20000000 + i * 79190).slice(0, 8)}`, block, floor, room.id, room.room_no).lastInsertRowid;
    studentRows.push({ id: sid, user_id: uid, name, email, block, room_no: room.room_no, floor });
  }
  // update room occupancy
  for (const [rid, occ] of Object.entries(roomOcc)) {
    db.prepare('UPDATE rooms SET occupied=?, status=? WHERE id=?').run(occ, occ >= 3 ? 'occupied' : (occ > 0 ? 'occupied' : 'vacant'), rid);
  }

  const today = new Date();
  // ---- bills: 3 months x 4 fee types ----
  const months = [0, 1, 2].map(k => { const d = new Date(today); d.setMonth(d.getMonth() - k); return d.toISOString().slice(0, 7); });
  const feeTypes = [['hostel rent', 8000], ['mess fee', 4500], ['electricity', 800], ['maintenance', 500]];
  const billStmt = db.prepare('INSERT INTO bills (student_id, user_id, fee_type, amount, due_date, month, status, fine) VALUES (?,?,?,?,?,?,?,?)');
  const payStmt = db.prepare('INSERT INTO payments (bill_id, student_id, amount, method, transaction_id, paid_at) VALUES (?,?,?,?,?,?)');
  let tx = 1000;
  for (const m of months) {
    for (const s of studentRows) {
      for (const [ft, amt] of feeTypes) {
        const due = `${m}-10`;
        const overdue = new Date(due) < new Date(iso(today)) && rnd() < 0.3;
        const paid = rnd() < (m === months[0] ? 0.55 : 0.8);
        const status = paid ? 'Paid' : (overdue ? 'Overdue' : 'Pending');
        const fine = !paid && overdue ? 100 : 0;
        const b = billStmt.run(s.id, s.user_id, ft, amt, due, m, status, fine);
        if (paid) {
          payStmt.run(b.lastInsertRowid, s.id, amt, pick(['UPI', 'Card', 'Net Banking']), 'TXN2026' + (tx++), `${m}-${pad(5 + Math.floor(rnd() * 20))}T10:00:00.000Z`);
        }
      }
    }
  }

  // ---- attendance: last 30 days ----
  const attStmt = db.prepare('INSERT OR IGNORE INTO attendance (student_id, date, status, marked_by) VALUES (?,?,?,?)');
  for (let d = 29; d >= 0; d--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - d);
    const ds = iso(dt);
    for (const s of studentRows) {
      const r = rnd();
      const status = r < 0.88 ? 'present' : r < 0.94 ? 'absent' : r < 0.97 ? 'on-leave' : 'on-outpass';
      attStmt.run(s.id, ds, status, wardenIds[0]);
    }
  }
  // force a 3-day absent streak for demo alert (student 5)
  for (let d = 2; d >= 0; d--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - d);
    db.prepare('INSERT OR REPLACE INTO attendance (student_id, date, status, marked_by) VALUES (?,?,?,?)').run(studentRows[4].id, iso(dt), 'absent', wardenIds[0]);
  }

  // ---- outpasses: 18 mixed ----
  const reasons = [['Family function', 'Hometown'], ['Medical checkup', 'City Hospital'], ['Interview', 'Tech Park'], ['Festival', 'Home'], ['Shopping', 'City Mall'], ['Friend visit', 'Nearby town']];
  const statuses = ['Pending', 'Pending', 'Pending', 'Approved', 'Approved', 'Rejected', 'CheckedOut', 'Returned', 'Returned', 'Approved'];
  for (let i = 0; i < 18; i++) {
    const s = studentRows[(i * 3 + 1) % studentRows.length];
    const [reason, dest] = reasons[i % reasons.length];
    const out = new Date(today); out.setDate(out.getDate() - (i % 10)); out.setHours(9, 0, 0, 0);
    const ret = new Date(out); ret.setDate(ret.getDate() + 2); ret.setHours(18, 0, 0, 0);
    const st = statuses[i % statuses.length];
    db.prepare(`INSERT INTO outpasses (student_id, reason, destination, out_datetime, return_datetime, parent_contact, emergency, status, remarks, decided_by) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(s.id, reason, dest, out.toISOString(), ret.toISOString(), '98XXXXXXXX', i === 2 ? 1 : 0, st, st === 'Rejected' ? 'Insufficient reason' : st === 'Approved' ? 'Approved. Be safe.' : null, st === 'Pending' ? null : wardenIds[0]);
  }

  // ---- mess menu (weekly) ----
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const menuItems = {
    breakfast: ['Poha + Jalebi, Milk', 'Idli Sambar, Chutney', 'Aloo Paratha, Curd', 'Upma, Coconut Chutney', 'Puri Sabzi, Milk', 'Dosa, Sambar', 'Chole Bhature, Lassi'],
    lunch: ['Dal, Rice, Roti, Sabzi', 'Rajma Chawal, Salad', 'Veg Biryani, Raita', 'Paneer, Dal, Rice, Roti', 'Sambar Rice, Papad', 'Khichdi, Kadhi', 'Chole Rice, Salad'],
    snacks: ['Samosa + Tea', 'Bread Pakora + Tea', 'Maggi + Coffee', 'Vada Pav + Tea', 'Cake + Milk', 'Puff + Tea', 'Biscuits + Milk'],
    dinner: ['Roti, Dal, Sabzi', 'Veg Pulao, Raita', 'Paneer Butter Masala, Naan', 'Dal Khichdi, Papad', 'Egg Curry, Rice', 'Mix Veg, Roti, Dal', 'Special Thali']
  };
  for (let i = 0; i < 7; i++) {
    for (const meal of ['breakfast', 'lunch', 'snacks', 'dinner']) {
      db.prepare('INSERT OR IGNORE INTO mess_menu (day, meal, items) VALUES (?,?,?)').run(days[i], meal, menuItems[meal][i]);
    }
  }

  // ---- mess records: 60 days x 4 meals ----
  const recStmt = db.prepare('INSERT OR IGNORE INTO mess_records (date, meal, prepared_kg, consumed_kg, wasted_kg, eaters, cost_waste) VALUES (?,?,?,?,?,?,?)');
  for (let d = 60; d >= 1; d--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - d);
    const ds = iso(dt);
    const dow = dt.getDay();
    const weekendDip = dow === 0 ? 0.75 : dow === 6 ? 0.88 : 1;
    for (const meal of ['breakfast', 'lunch', 'snacks', 'dinner']) {
      const base = meal === 'lunch' ? 52 : meal === 'dinner' ? 50 : meal === 'breakfast' ? 45 : 30;
      const eaters = Math.max(10, Math.round(base * weekendDip + (rnd() * 8 - 4)));
      const perPerson = 0.3 + rnd() * 0.12;
      const prepared = Math.round(eaters * perPerson * 1.15 * 100) / 100;
      const wastePct = 0.05 + rnd() * 0.14 + (meal === 'snacks' ? 0.03 : 0);
      const wasted = Math.round(prepared * wastePct * 100) / 100;
      const consumed = Math.round((prepared - wasted) * 100) / 100;
      recStmt.run(ds, meal, prepared, consumed, wasted, eaters, Math.round(wasted * 120 * 100) / 100);
    }
  }

  // ---- meal feedback ----
  for (let i = 0; i < 80; i++) {
    const s = studentRows[Math.floor(rnd() * studentRows.length)];
    const dt = new Date(today); dt.setDate(dt.getDate() - Math.floor(rnd() * 10));
    db.prepare('INSERT INTO meal_feedback (student_id, date, meal, rating, skipping, comment) VALUES (?,?,?,?,?,?)')
      .run(s.id, iso(dt), pick(['breakfast', 'lunch', 'snacks', 'dinner']), 1 + Math.floor(rnd() * 5), rnd() < 0.15 ? 1 : 0, pick(['Tasty!', 'Too spicy', 'Good', 'Needs variety', 'Loved it', null]));
  }

  // ---- complaints + compliments (25) ----
  const cats = ['Food', 'Room', 'Cleanliness', 'Electricity', 'Water', 'WiFi', 'Staff', 'Security', 'Other'];
  for (let i = 0; i < 25; i++) {
    const s = studentRows[(i * 5 + 2) % studentRows.length];
    const isCompliment = i >= 20;
    const cat = cats[i % cats.length];
    const desc = isCompliment
      ? pick(['Mess staff were very courteous today. Thank you!', 'Warden resolved my issue quickly. Grateful!', 'Rooms cleaned on time. Great work housekeeping!', 'WiFi speed improved a lot. Appreciated!', 'Delicious dinner today, kudos to the mess team!'])
      : `${cat} issue in Block ${s.block} room ${s.room_no}: ${pick(['not working since yesterday, please fix', 'needs urgent attention', 'repeated issue, kindly resolve', 'causing inconvenience to roommates'])}`;
    const status = isCompliment ? 'Resolved' : pick(['Open', 'Open', 'In Progress', 'Resolved', 'Resolved']);
    const r = db.prepare(`INSERT INTO complaints (student_id, user_id, type, category, description, anonymous, priority, status, satisfaction, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(s.id, s.user_id, isCompliment ? 'compliment' : 'complaint', cat, desc, rnd() < 0.2 ? 1 : 0, pick(['Low', 'Medium', 'High']), status, status === 'Resolved' ? 3 + Math.floor(rnd() * 3) : null, new Date(today.getTime() - i * 864e5).toISOString());
    if (status !== 'Open') db.prepare('INSERT INTO comments (complaint_id, user_id, message) VALUES (?,?,?)').run(r.lastInsertRowid, wardenIds[0], 'Noted. Our team is on it.');
  }

  // ---- notices, events, laundry ----
  const notices = [
    ['Mess timings updated', 'Breakfast 7–9am, Lunch 12–2pm, Snacks 4:30–6pm, Dinner 7–9pm.', 'all', 1],
    ['Fee due date reminder', 'September fees due by 10th. Late fine ₹100 applies.', 'all', 1],
    ['Block A water maintenance', 'Water supply paused 10am–1pm tomorrow in Block A.', 'block:A', 0],
    ['Cultural fest auditions', 'Auditions for annual fest this Saturday at the common hall.', 'all', 0],
    ['WiFi upgrade', 'WiFi upgrade in Block C floors 2–3 this weekend.', 'block:C', 0],
    ['Holiday: Diwali break', 'Hostel remains open with special mess menu during Diwali.', 'all', 0],
  ];
  for (const [t, b, tgt, p] of notices) db.prepare('INSERT INTO notices (title, body, target, pinned, created_by) VALUES (?,?,?,?,?)').run(t, b, tgt, p, adminId);
  const evs = [['Independence Day', -40, 'holiday'], ['Diwali', 20, 'holiday'], ['Cultural Fest', 12, 'event'], ['Sports Day', -5, 'event'], ['Pongal', 30, 'holiday'], ['Tech Talk', 5, 'event'], ['Mess Committee Meet', 3, 'event'], ['Christmas', 87, 'holiday']];
  for (const [t, off, k] of evs) { const d = new Date(today); d.setDate(d.getDate() + off); db.prepare('INSERT INTO events (title, date, kind, description) VALUES (?,?,?,?)').run(t, iso(d), k, t); }
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  for (const d of weekDays) for (const slot of ['7–9 AM', '9–11 AM', '2–4 PM', '4–6 PM']) {
    db.prepare('INSERT OR IGNORE INTO laundry_slots (day, slot, capacity, booked) VALUES (?,?,?,?)').run(d, slot, 10, Math.floor(rnd() * 6));
  }
  // visitors + maintenance + leaves + room requests samples
  for (let i = 0; i < 8; i++) {
    const s = studentRows[(i * 7) % studentRows.length];
    db.prepare('INSERT INTO visitors (name, phone, student_id, purpose, logged_by) VALUES (?,?,?,?,?)').run(pick(['Ramesh Kumar', 'Sunita Devi', 'Amit Shah', 'Priya Nair']), '98XXXXXXXX', s.id, pick(['Parent visit', 'Delivery', 'Guardian meeting']), wardenIds[0]);
  }
  for (let i = 0; i < 10; i++) {
    const s = studentRows[(i * 4 + 1) % studentRows.length];
    db.prepare('INSERT INTO maintenance (student_id, block, room_no, issue, category, status, technician) VALUES (?,?,?,?,?,?,?)')
      .run(s.id, s.block, s.room_no, pick(['Tap leaking', 'Tube light not working', 'Fan making noise', 'WiFi weak signal', 'Door lock jammed']), pick(['Plumbing', 'Electrical', 'Carpentry', 'Network']), pick(['Open', 'Assigned', 'Fixed']), pick(['Ravi (Electrician)', 'Suresh (Plumber)', null]));
  }
  for (let i = 0; i < 6; i++) {
    const s = studentRows[(i * 9 + 3) % studentRows.length];
    db.prepare('INSERT INTO leaves (student_id, reason, from_date, to_date, status) VALUES (?,?,?,?,?)')
      .run(s.id, pick(['Family wedding', 'Medical treatment', 'Internship', 'Home visit']), iso(new Date(today.getTime() - 5 * 864e5)), iso(new Date(today.getTime() + 2 * 864e5)), pick(['Pending', 'Approved', 'Approved']));
  }
  for (let i = 0; i < 4; i++) {
    const s = studentRows[(i * 11 + 5) % studentRows.length];
    db.prepare('INSERT INTO room_requests (student_id, from_room, to_block, to_room, reason, status) VALUES (?,?,?,?,?,?)')
      .run(s.id, `${s.block}-${s.room_no}`, pick(BLOCKS), null, pick(['Want to shift with friend', 'Too noisy, need quieter floor', 'Closer to library block']), pick(['Pending', 'WardenApproved', 'Approved']));
  }
  db.prepare('INSERT INTO notifications (user_id, title, body, kind) VALUES (?,?,?,?)').run(adminId, 'Welcome to HostelSphere', 'Seed complete. Explore dashboards.', 'info');

  console.log('Seed complete: 1 admin, 5 wardens, 58 students + bills/attendance/mess/complaints.');
}
run();
