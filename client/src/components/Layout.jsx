import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, BedDouble, Receipt, CalendarCheck, DoorOpen, UtensilsCrossed, MessageSquareWarning, Bell, Megaphone, Search, Sun, Moon, LogOut, Siren, FileText, CreditCard, UsersRound, Wrench, WashingMachine, Repeat, Palmtree, CalendarDays, HeartHandshake, ScrollText } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../api.js';
import Chatbot from './Chatbot.jsx';

const NAV = {
  ADMIN: [
    ['Dashboard', '/admin', LayoutDashboard], ['Students', '/admin/students', Users], ['Wardens', '/admin/wardens', UsersRound],
    ['Rooms', '/admin/rooms', BedDouble], ['Bills & Payments', '/admin/bills', Receipt], ['Attendance', '/admin/attendance', CalendarCheck],
    ['Outpass', '/admin/outpass', DoorOpen], ['Mess & Predictor', '/admin/mess', UtensilsCrossed], ['Complaints', '/admin/complaints', MessageSquareWarning],
    ['Notices', '/app/notices', Megaphone], ['Visitors', '/app/visitors', Search], ['Maintenance', '/app/maintenance', Wrench],
    ['Laundry', '/app/laundry', WashingMachine], ['Room Requests', '/app/room-requests', Repeat], ['Leaves', '/app/leaves', Palmtree],
    ['Events', '/app/events', CalendarDays], ['Wall of Appreciation', '/app/wall', HeartHandshake], ['Reports', '/app/reports', FileText], ['Audit Log', '/app/audit', ScrollText],
  ],
  WARDEN: [
    ['Dashboard', '/warden', LayoutDashboard], ['Attendance', '/warden/attendance', CalendarCheck], ['Outpass', '/warden/outpass', DoorOpen],
    ['Bills (read-only)', '/warden/bills', Receipt], ['Mess & Predictor', '/warden/mess', UtensilsCrossed], ['Complaints', '/warden/complaints', MessageSquareWarning],
    ['Notices', '/app/notices', Megaphone], ['Visitors', '/app/visitors', Search], ['Maintenance', '/app/maintenance', Wrench],
    ['Laundry', '/app/laundry', WashingMachine], ['Room Requests', '/app/room-requests', Repeat], ['Leaves', '/app/leaves', Palmtree],
    ['Events', '/app/events', CalendarDays], ['SOS Alerts', '/app/sos', Siren],
  ],
  STUDENT: [
    ['Dashboard', '/student', LayoutDashboard], ['My Bills', '/student/bills', Receipt], ['Outpass', '/student/outpass', DoorOpen],
    ['Attendance', '/student/attendance', CalendarCheck], ['Mess', '/student/mess', UtensilsCrossed], ['Complaints', '/student/complaints', MessageSquareWarning],
    ['Notices', '/app/notices', Megaphone], ['Laundry', '/app/laundry', WashingMachine], ['Maintenance', '/app/maintenance', Wrench],
    ['Room Request', '/app/room-requests', Repeat], ['Leave', '/app/leaves', Palmtree], ['Events', '/app/events', CalendarDays],
    ['Wall of Appreciation', '/app/wall', HeartHandshake], ['My ID Card', '/app/profile', CreditCard],
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [notif, setNotif] = useState({ rows: [], unread: 0 });
  const [showN, setShowN] = useState(false);
  const [mobile, setMobile] = useState(false);
  const links = NAV[user?.role] || [];

  const loadNotif = () => api.get('/notifications').then((r) => setNotif({ rows: r.data.data, unread: r.data.unread })).catch(() => {});
  useEffect(() => { loadNotif(); const t = setInterval(loadNotif, 30000); return () => clearInterval(t); }, []);
  const markRead = () => api.post('/notifications/read').then(loadNotif);

  const doSearch = (e) => { e.preventDefault(); if (q.trim().length >= 2) nav('/app/search?q=' + encodeURIComponent(q.trim())); };

  return (
    <div className="app-bg min-h-screen text-gray-900 dark:text-gray-100">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className={`${mobile ? 'fixed z-40 inset-y-0 left-0 w-64' : 'hidden'} lg:flex flex-col w-64 shrink-0 glass m-2 rounded-2xl p-3 max-h-[calc(100vh-1rem)] overflow-auto`}>
          <div className="font-heading font-bold text-lg px-2 py-3">🏠 Hostel<span className="text-amber-500">Sphere</span></div>
          <div className="text-xs px-2 mb-1 opacity-60">{user?.role} · {user?.name}</div>
          <nav className="space-y-1">
            {links.map(([label, to, Icon]) => (
              <NavLink key={to + label} to={to} onClick={() => setMobile(false)}
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${isActive ? 'bg-amber-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}>
                <Icon size={17} /> {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        {mobile && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobile(false)} />}

        <div className="flex-1 min-w-0 p-2 lg:pl-0">
          {/* Topbar */}
          <header className="glass rounded-2xl px-3 py-2 flex items-center gap-2 mb-2">
            <button className="lg:hidden px-2" onClick={() => setMobile(true)}>☰</button>
            <form onSubmit={doSearch} className="flex-1 flex items-center gap-2 bg-white/60 dark:bg-black/30 rounded-xl px-3 py-1.5">
              <Search size={16} className="opacity-60" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Global search: students, rooms, bills…" className="bg-transparent outline-none text-sm w-full" />
            </form>
            <button onClick={toggle} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <div className="relative">
              <button onClick={() => { setShowN(!showN); }} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 relative">
                <Bell size={18} />
                {notif.unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full px-1.5">{notif.unread}</span>}
              </button>
              {showN && (
                <div className="absolute right-0 mt-2 w-80 glass rounded-2xl p-2 z-50 max-h-96 overflow-auto">
                  <div className="flex justify-between items-center px-2 py-1"><b className="text-sm">Notifications</b><button onClick={markRead} className="text-xs text-amber-600">Mark all read</button></div>
                  {notif.rows.map((n) => <div key={n.id} className={`p-2 rounded-xl text-xs mb-1 ${n.read ? 'opacity-60' : 'bg-amber-100/60 dark:bg-white/10'}`}><b>{n.title}</b><div>{n.body}</div></div>)}
                  {!notif.rows.length && <div className="text-xs p-2 opacity-60">No notifications</div>}
                </div>
              )}
            </div>
            <button onClick={() => nav('/app/profile')} className="flex items-center gap-2 p-1 rounded-xl hover:bg-black/5">
              <img src={user?.avatar || `https://i.pravatar.cc/40?u=${user?.email}`} className="w-8 h-8 rounded-full" alt="" />
              <span className="text-sm font-semibold hidden sm:block">{user?.name?.split(' ')[0]}</span>
            </button>
            <button onClick={() => { logout(); nav('/login'); }} className="p-2 rounded-xl hover:bg-black/5" title="Logout"><LogOut size={18} /></button>
          </header>
          <main className="pb-16"><Outlet /></main>
        </div>
      </div>
      <Chatbot />
    </div>
  );
}
