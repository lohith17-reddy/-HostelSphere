// SQLite via Node built-in node:sqlite (zero setup, no native build).
// Minimal better-sqlite3-compatible wrapper: prepare().get/all/run + exec.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'hostel.db');
const raw = new DatabaseSync(DB_PATH);
raw.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);

function normalizeResult(res, stmt) {
  if (res && typeof res.lastInsertRowid === 'bigint') res.lastInsertRowid = Number(res.lastInsertRowid);
  if (res && typeof res.changes === 'bigint') res.changes = Number(res.changes);
  return res;
}

const db = {
  exec: (sql) => raw.exec(sql),
  prepare: (sql) => {
    const stmt = raw.prepare(sql);
    return {
      get: (...params) => stmt.get(...params),
      all: (...params) => stmt.all(...params),
      run: (...params) => normalizeResult(stmt.run(...params), stmt),
    };
  },
};

function initSchema() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN','WARDEN','STUDENT')),
    name TEXT NOT NULL,
    phone TEXT,
    avatar TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS wardens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    block TEXT NOT NULL,
    floor TEXT DEFAULT 'All'
  );
  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    floors INTEGER DEFAULT 3,
    warden_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block TEXT NOT NULL,
    floor INTEGER NOT NULL,
    room_no TEXT NOT NULL,
    capacity INTEGER DEFAULT 3,
    occupied INTEGER DEFAULT 0,
    status TEXT DEFAULT 'vacant' CHECK(status IN ('occupied','vacant','maintenance')),
    UNIQUE(block, room_no)
  );
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roll_no TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    year INTEGER NOT NULL,
    guardian_name TEXT,
    guardian_phone TEXT,
    block TEXT NOT NULL,
    floor INTEGER NOT NULL,
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    room_no TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fee_type TEXT NOT NULL,
    amount REAL NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Paid','Pending','Overdue')),
    month TEXT NOT NULL,
    fine REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    transaction_id TEXT UNIQUE NOT NULL,
    paid_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present','absent','on-leave','on-outpass')),
    marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(student_id, date)
  );
  CREATE TABLE IF NOT EXISTS outpasses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    destination TEXT NOT NULL,
    out_datetime TEXT NOT NULL,
    return_datetime TEXT NOT NULL,
    parent_contact TEXT,
    emergency INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected','CheckedOut','Returned','Overdue')),
    remarks TEXT,
    decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    checked_out_at TEXT,
    returned_at TEXT,
    late INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS mess_menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    meal TEXT NOT NULL CHECK(meal IN ('breakfast','lunch','snacks','dinner')),
    items TEXT NOT NULL,
    UNIQUE(day, meal)
  );
  CREATE TABLE IF NOT EXISTS mess_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    prepared_kg REAL NOT NULL,
    consumed_kg REAL NOT NULL,
    wasted_kg REAL NOT NULL,
    eaters INTEGER NOT NULL,
    cost_waste REAL DEFAULT 0,
    UNIQUE(date, meal)
  );
  CREATE TABLE IF NOT EXISTS meal_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    skipping INTEGER DEFAULT 0,
    comment TEXT
  );
  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK(type IN ('complaint','compliment')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT,
    anonymous INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'Medium' CHECK(priority IN ('Low','Medium','High','Critical')),
    status TEXT DEFAULT 'Open' CHECK(status IN ('Open','In Progress','Resolved')),
    satisfaction INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target TEXT DEFAULT 'all',
    pinned INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    kind TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    purpose TEXT,
    in_time TEXT DEFAULT (datetime('now')),
    out_time TEXT,
    logged_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    block TEXT NOT NULL,
    room_no TEXT NOT NULL,
    issue TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    status TEXT DEFAULT 'Open' CHECK(status IN ('Open','Assigned','Fixed','Closed')),
    technician TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS laundry_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    slot TEXT NOT NULL,
    capacity INTEGER DEFAULT 10,
    booked INTEGER DEFAULT 0,
    UNIQUE(day, slot)
  );
  CREATE TABLE IF NOT EXISTS laundry_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id INTEGER NOT NULL REFERENCES laundry_slots(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(slot_id, student_id)
  );
  CREATE TABLE IF NOT EXISTS room_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    from_room TEXT NOT NULL,
    to_block TEXT NOT NULL,
    to_room TEXT,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','WardenApproved','Approved','Rejected')),
    warden_remark TEXT,
    admin_remark TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    from_date TEXT NOT NULL,
    to_date TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),
    decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    kind TEXT DEFAULT 'event' CHECK(kind IN ('event','holiday')),
    description TEXT
  );
  CREATE TABLE IF NOT EXISTS sos_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT DEFAULT 'Active' CHECK(status IN ('Active','Resolved')),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  `);
}

initSchema();

module.exports = db;
