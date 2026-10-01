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
# 🏨 HostelSphere — Smart Hostel Management System

> A modern, full-stack hostel management platform designed to digitize and simplify hostel administration, student services, room management, attendance, billing, outpasses, mess operations, complaints, and daily hostel activities.

[![Node.js](https://img.shields.io/badge/Node.js-22%2B-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Latest-purple?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-cyan?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express.js-Backend-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

## 📌 Overview

**HostelSphere** is a comprehensive hostel management platform that provides a centralized system for students, wardens, administrators, and hostel staff.

The platform replaces manual hostel operations with a digital workflow for:

- 👨‍🎓 Student management
- 🏠 Room allocation
- 👮 Warden management
- 💰 Fee and bill management
- 📊 Attendance tracking
- 🚪 Outpass management
- 🍽️ Mess management and food-waste prediction
- 📝 Complaints and feedback
- 🔧 Maintenance requests
- 🧺 Laundry management
- 📢 Notices and notifications
- 👥 Visitor management
- 📅 Leave and event management
- 🆘 Emergency/SOS support
- 📈 Reports and analytics

The system is designed with a responsive interface and supports both **Light Mode and Dark Mode**.

---

# ✨ Key Features

## 🔐 Authentication & Authorization

- JWT-based authentication
- Role-Based Access Control (RBAC)
- Separate access for:
  - 👑 Admin
  - 👮 Warden
  - 👨‍🎓 Student
- Protected frontend routes
- Protected backend APIs
- Password change functionality
- Forgot-password workflow
- Secure password handling

---

## 👑 Admin Dashboard

Administrators can monitor and manage the complete hostel ecosystem.

### Dashboard

- Hostel statistics
- Student statistics
- Room occupancy
- Revenue analytics
- Attendance overview
- Complaint analytics
- Outpass activity
- System notifications

### Management

- Manage students
- Manage wardens
- Search and filter records
- Pagination
- CSV exports
- Room management
- Room allocation
- Audit logs

---

# 🏠 Room Management

HostelSphere provides a visual approach to hostel room management.

### Capabilities

- Room listing
- Room availability
- Occupancy tracking
- Room allocation
- Room changes
- Visual room-grid representation
- Student-room mapping
- Warden-controlled room changes
- Admin-controlled room management

---

# 💰 Billing & Payments

The billing module helps automate hostel fee management.

### Features

- Generate bills
- Generate bills for selected students
- Generate bills for all students
- Late-payment fines
- Payment reminders
- Defaulter tracking
- Revenue analytics
- Student payment interface
- UPI payment simulation
- Card payment simulation
- Net Banking simulation
- Transaction ID generation
- PDF receipt generation

---

# 📊 Attendance Management

HostelSphere provides centralized attendance management.

### Warden

- Bulk attendance marking
- Mark all students present
- Attendance management

### Student

- Attendance calendar
- Attendance percentage
- Attendance history

### Admin

- Attendance reports
- CSV export
- Attendance analytics

### Smart Alerts

The system can generate alerts for students with repeated absences.

---

# 🚪 Digital Outpass System

The outpass module digitizes the complete student movement workflow.

### Workflow

```text
Student
   ↓
Apply for Outpass
   ↓
Warden/Admin Review
   ↓
Approve / Reject
   ↓
QR Digital Pass
   ↓
Checkout
   ↓
Return
   ↓
Attendance Updated
```

### Features

- Outpass application
- Approval/rejection
- Remarks
- QR-based digital pass
- Checkout tracking
- Return tracking
- Late-return flag
- Emergency highlighting
- Outpass timeline
- Notifications

Approved outpasses can automatically affect attendance records.

---

# 🍽️ Smart Mess & Food-Waste Prediction

One of the major smart features of HostelSphere is the **Mess Predictor**.

The system uses historical hostel data to estimate:

- Expected number of students eating
- Required food quantity
- Expected food consumption
- Potential food wastage
- Wastage cost
- Risk indicators

### Prediction Inputs

The prediction system considers factors such as:

- Historical attendance
- Previous mess consumption
- 14-day average
- Weekday patterns
- Holidays
- Outpass records
- Leave records
- Attendance
- Food-waste ratio
- Meal skipping patterns

### Benefits

- Reduce food wastage
- Improve food planning
- Reduce unnecessary expenses
- Support better mess operations
- Help hostel administrators make data-driven decisions

---

# 📝 Complaint Management

Students can digitally submit and track complaints.

### Features

- Complaint submission
- Compliment submission
- Complaint categories
- Anonymous complaints
- Priority levels
- Status tracking
- Open → In Progress → Resolved workflow
- Complaint discussions/threads
- Resolution rating
- Escalation flags
- Complaint analytics
- Wall of Appreciation

---

# 🔧 Maintenance Management

The maintenance module allows students and hostel staff to manage maintenance issues.

### Features

- Maintenance requests
- Issue tracking
- Technician assignment
- Status updates
- Resolution tracking
- Notifications

---

# 📢 Notices & Notifications

Administrators and wardens can communicate important information to students.

### Notices

- Hostel-wide notices
- Block-specific notices
- Floor-specific notices
- Pinned notices

### Notifications

- Outpass updates
- Payment reminders
- Complaint updates
- Attendance alerts
- Maintenance updates
- System notifications

---

# 👥 Visitor Management

HostelSphere provides digital visitor tracking.

- Visitor records
- Student association
- Visit tracking
- Visitor history

---

# 🧺 Laundry Management

Students can manage laundry-related activities through the platform.

- Laundry slot management
- Slot availability
- Booking workflow
- Schedule tracking

---

# 📅 Leave & Event Management

The system supports:

- Student leave requests
- Leave tracking
- Hostel events
- Holidays
- Event notifications

Holiday and event information can also contribute to mess prediction.

---

# 🪪 Digital Student ID

Students can access a digital hostel ID card.

### Includes

- Student information
- Hostel information
- QR code
- Printable ID card

---

# 🆘 Emergency & SOS

HostelSphere includes an emergency support workflow.

Students can quickly raise SOS requests for urgent situations.

---

# 🤖 Rule-Based Chatbot

A built-in rule-based chatbot provides quick assistance for common hostel-related queries.

It can help students navigate information related to:

- Hostel rules
- Rooms
- Complaints
- Outpass
- Mess
- Attendance
- Bills
- Other hostel services

---

# 🔎 Global Search

A centralized search system allows users to quickly find relevant hostel information.

---

# 📈 Reports & Analytics

Hostel administrators can access reports and analytics for:

- Students
- Rooms
- Attendance
- Revenue
- Complaints
- Outpasses
- Mess operations
- Hostel activities

Reports can also be exported as CSV files.

---

# 🎨 User Interface

HostelSphere provides a modern responsive interface.

### UI Features

- Responsive design
- Light Mode
- Dark Mode
- Glassmorphism UI
- Hostel-themed visual design
- Sidebar navigation
- Mobile navigation
- Cards
- Tables
- Charts
- Modals
- Toast notifications
- Loading states
- Empty states
- Error states
- Form validation
- Confirmation dialogs
- Skeleton loaders

The interface is designed to work across:

- 💻 Desktop
- 📱 Mobile
- 📟 Tablet

---

# 🛠️ Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- React Hook Form
- Zod
- Axios
- Recharts
- Lucide Icons
- jsPDF

## Backend

- Node.js
- Express.js
- JWT
- bcrypt
- REST APIs

## Database

- SQLite
- Node.js built-in `node:sqlite`

## Development

- npm
- Git
- GitHub

---

# 📁 Project Structure

```text
HostelSphere/
│
├── api/
│
├── client/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── ...
│
├── server/
│   ├── index.js
│   ├── db.js
│   ├── auth.js
│   ├── utils.js
│   ├── routes/
│   ├── seed.js
│   └── ...
│
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

---

# ⚙️ Requirements

Before running HostelSphere, make sure you have:

- Node.js **22 or higher**
- npm

HostelSphere uses Node's built-in `node:sqlite`, so a separate SQLite installation or native database compiler is not required.

---

# 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/lohith17-reddy/-HostelSphere.git
```

```bash
cd -HostelSphere
```

### 2. Install dependencies

```bash
npm run install:all
```

Alternatively:

```bash
npm --prefix server install
npm --prefix client install
```

### 3. Configure environment

Copy the example environment file:

### Windows PowerShell

```powershell
Copy-Item .env.example server\.env
```

### Linux / macOS

```bash
cp .env.example server/.env
```

The application includes sensible development defaults.

---

# 🌱 Seed Database

Create the local SQLite database and demo data:

```bash
npm run seed
```

This creates:

```text
server/hostel.db
```

To reset the demo database, run:

```bash
npm run seed
```

again.

> `server/hostel.db` and `server/.env` should remain local and should not be committed to GitHub.

---

# ▶️ Run the Application

## Start Backend

```bash
npm run dev
```

Backend:

```text
http://localhost:5000
```

## Start Frontend

Open another terminal:

```bash
npm --prefix client run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🔑 Demo Credentials

The seeded development database provides demo accounts.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hostel.com` | `Admin@123` |
| Warden | `warden1@hostel.com` | `Warden@123` |
| Student | `student1@hostel.com` | `Student@123` |

Additional seeded warden and student accounts are available in the development database.

> These credentials are intended for local development/demo purposes only. Change authentication configuration and credentials before production deployment.

---

# 🧪 End-to-End Verification

A basic end-to-end workflow can be tested using the seeded accounts.

### Test 1 — Outpass

```text
Student Login
     ↓
Apply Outpass
     ↓
Logout
     ↓
Warden Login
     ↓
Approve Outpass
     ↓
Checkout
     ↓
Verify Attendance
```

### Test 2 — Payment

```text
Student Login
     ↓
Open Pending Bill
     ↓
Complete Mock Payment
     ↓
Transaction ID Generated
     ↓
PDF Receipt Generated
```

### Test 3 — Admin

```text
Admin Login
     ↓
Dashboard
     ↓
Revenue
     ↓
Reports
     ↓
Analytics
```

---

# 🔒 Security

HostelSphere includes several security mechanisms:

- JWT authentication
- Role-based authorization
- Protected routes
- Backend authorization middleware
- Password hashing
- Environment-based configuration
- Git ignore rules for local secrets
- Input validation
- Controlled API access

Never commit:

```text
.env
server/.env
server/hostel.db
```

or other secrets to a public repository.

---

# 🧩 Application Architecture

```text
                    ┌──────────────────────┐
                    │      HostelSphere    │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
        ┌───────▼────────┐           ┌────────▼────────┐
        │    Frontend    │           │     Backend     │
        │ React + Vite   │◄─────────►│ Node + Express  │
        │ Tailwind CSS   │   REST    │ JWT + RBAC      │
        └────────────────┘    API    └────────┬────────┘
                                               │
                                      ┌────────▼────────┐
                                      │      SQLite     │
                                      │     Database    │
                                      └─────────────────┘
```

---

# 🔄 Core User Roles

## 👑 Admin

Responsible for overall hostel administration.

- Manage students
- Manage wardens
- Manage rooms
- Monitor attendance
- Manage billing
- View analytics
- Manage complaints
- View reports
- Publish notices
- Monitor hostel operations

## 👮 Warden

Responsible for day-to-day hostel operations.

- Manage student attendance
- Process outpasses
- Manage rooms
- Handle complaints
- Monitor students
- Manage maintenance
- Approve requests

## 👨‍🎓 Student

Students can:

- View hostel information
- View room details
- Check attendance
- Apply for outpass
- View bills
- Make mock payments
- Download receipts
- Submit complaints
- Request maintenance
- Manage laundry
- Apply for leave
- View notices
- Use digital ID
- Access hostel services

---

# 📊 Smart Hostel Management

HostelSphere brings multiple hostel operations into one platform:

```text
Students
   │
   ├── Rooms
   ├── Attendance
   ├── Outpass
   ├── Bills
   ├── Complaints
   ├── Maintenance
   ├── Mess
   ├── Laundry
   ├── Leave
   └── Visitors
          │
          ▼
   ┌───────────────────┐
   │   HostelSphere    │
   │   Central System   │
   └───────────────────┘
          │
          ├── Analytics
          ├── Reports
          ├── Notifications
          └── Smart Predictions
```

---

# 🚧 Future Enhancements

Potential future improvements include:

- Real payment gateway integration
- Real-time WebSocket notifications
- Advanced ML-based mess prediction
- Automated food procurement recommendations
- Face recognition attendance
- Mobile application
- Push notifications
- Email/SMS notifications
- Advanced AI hostel assistant
- Cloud database deployment
- Advanced analytics
- Multi-hostel support
- Cloud storage for documents
- Automated backup and recovery

---

# 🤝 Contributing

Contributions are welcome.

### 1. Fork the repository

```bash
git fork
```

### 2. Create a feature branch

```bash
git checkout -b feature/your-feature
```

### 3. Commit your changes

```bash
git commit -m "Add: your feature"
```

### 4. Push the branch

```bash
git push origin feature/your-feature
```

### 5. Open a Pull Request

---

# 📄 License

This project is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for details.

---

# 👨‍💻 Author

**Lohith Sagar Reddy**

B.Tech — Computer Science & Engineering (AI/ML)

SRM Institute of Science and Technology (SRMIST)

### Connect

- GitHub: https://github.com/lohith17-reddy
- LinkedIn: https://www.linkedin.com/in/lohith-reddy-n-3ba67637

---

# ⭐ HostelSphere

**A smarter way to manage modern hostel operations.**

Built with ❤️ using React, Node.js, Express, SQLite, and modern web technologies.
