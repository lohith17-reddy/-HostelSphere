// Auth + RBAC middleware + helpers
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'hostel-dev-secret-change-me-min-32-chars-long!!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized: missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user || !user.active) return res.status(401).json({ success: false, message: 'Unauthorized: user inactive' });
    delete user.password_hash;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Unauthorized: invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
    next();
  };
}

// Warden can only touch students of their block
function wardenBlock(req) {
  if (req.user.role !== 'WARDEN') return null;
  const w = db.prepare('SELECT * FROM wardens WHERE user_id = ?').get(req.user.id);
  return w ? w.block : null;
}

function audit(actorId, action, entity, entityId, detail) {
  try {
    db.prepare('INSERT INTO audit_logs (actor_id, action, entity, entity_id, detail) VALUES (?,?,?,?,?)')
      .run(actorId || null, action, entity || null, entityId != null ? String(entityId) : null, detail || null);
  } catch {}
}

function notify(userId, title, body, kind = 'info') {
  try {
    db.prepare('INSERT INTO notifications (user_id, title, body, kind) VALUES (?,?,?,?)').run(userId, title, body || '', kind);
  } catch {}
}

function notifyRole(role, title, body, kind = 'info') {
  try {
    const users = db.prepare('SELECT id FROM users WHERE role = ?').all(role);
    const stmt = db.prepare('INSERT INTO notifications (user_id, title, body, kind) VALUES (?,?,?,?)');
    for (const u of users) stmt.run(u.id, title, body || '', kind);
  } catch {}
}

module.exports = { signToken, requireAuth, requireRole, wardenBlock, audit, notify, notifyRole, JWT_SECRET };
