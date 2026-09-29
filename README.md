# HostelSphere — Hostel Management System

Full-stack hostel management: **React + Vite + Tailwind** frontend, **Node + Express + SQLite** backend (zero setup, no paid services).
SQLite uses Node's built-in `node:sqlite` (Node **>= 22** required) — no compiler, no Docker, no API keys.

## Quick start

Requirements: **Node.js ≥ 22** (uses built-in `node:sqlite`, no native build tools needed).

```powershell
# 1. install
npm run install:all
# (or) npm --prefix server install; npm --prefix client install

# 2. environment (optional — sane dev defaults are built in)
Copy-Item .env.example server\.env

# 3. seed demo data
npm run seed

# 4. run backend (http://localhost:5000)
npm run dev
# 5. in another terminal, run frontend (http://localhost:5173)
npm --prefix client run dev
```

Seed creates `server/hostel.db` (SQLite). Re-run `npm run seed` anytime to reset.

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@hostel.com | Admin@123 |
| Warden | warden1@hostel.com … warden5@hostel.com | Warden@123 |
| Student | student1@hostel.com … student55@hostel.com | Student@123 |

Shown on the login page too.

## Features
- JWT auth + RBAC (frontend guards + backend middleware), change password, mock forgot-password
- Admin dashboard (stats + Recharts), manage wardens/students (search/filter/pagination/CSV), visual room-grid map
- Bills: generate for all/selected, late fines, reminders, defaulters, revenue charts; student mock payment (UPI/Card/NetBanking) → transaction ID → **PDF receipt** (jsPDF)
- Attendance: warden bulk mark + "mark all present", approved outpass auto-marks on-outpass, student calendar %, admin report + CSV, 3-day-absent auto-alerts
- Outpass: apply → warden/admin approve-reject with remarks → QR digital pass → checkout/return, late flag, timeline, emergency highlight, notifications
- Mess predictor: 60 days history; forecasts eaters + kg to cook using 14-day average, weekday, holidays, outpass/leave, attendance, waste ratio, skip signals; risk badges, wastage cost ₹, tips, ratings
- Complaints: complaint/compliment, categories, anonymous, priority, Open→In Progress→Resolved, threads, auto-escalation flag (3d), resolution rating, Wall of Appreciation, analytics
- Extras: notices (all/block/floor + pinned), notifications bell, visitors, maintenance + technician, laundry slots, room-change (warden+admin), leaves, events/holidays (feeds predictor), global search, audit log, SOS, reports (CSV), ID card with QR + print, rule-based chatbot, skeletons/toasts/confirms/empty states/validation, dark/light mode, responsive glassmorphism over hostel-building background

## E2E check
1. Login as student1 → apply outpass → logout
2. Login as warden1 → approve it → checkout → verify student attendance shows on-outpass
3. Login as student1 → pay a pending bill → PDF receipt downloads
4. Login as admin → dashboard, revenue, reports

## Structure
```
hostel-app/
  client/ (React + Vite + Tailwind)
  server/ (Express: index.js, db.js, auth.js, utils.js, routes/, seed.js)
```
(`server/hostel.db` and `server/.env` are created locally — never committed.)

## License
MIT — see [LICENSE](LICENSE).
