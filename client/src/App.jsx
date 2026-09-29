import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Layout from './components/Layout.jsx';
import { Toaster } from './components/UI.jsx';
import Login from './pages/Login.jsx';
import { AdminDashboard, WardenDashboard, StudentDashboard } from './pages/Dashboards.jsx';
import Bills from './pages/Bills.jsx';
import { WardenAttendance, StudentAttendance, AdminAttendance } from './pages/Attendance.jsx';
import Outpass from './pages/Outpass.jsx';
import Mess from './pages/Mess.jsx';
import Complaints from './pages/Complaints.jsx';
import { Students, Wardens, Rooms } from './pages/Manage.jsx';
import { Notices, Visitors, Maintenance, Laundry, RoomRequests, Leaves, Events, Reports, Profile, SearchPage, SOS, Wall, Audit } from './pages/Extras.jsx';

let toastRef = null;
function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-bg min-h-screen flex items-center justify-center text-white">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster register={(f) => (toastRef = f)} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/403" element={<div className="app-bg min-h-screen flex items-center justify-center text-white font-bold">403 — Forbidden</div>} />
            <Route element={<Guard roles={['ADMIN', 'WARDEN', 'STUDENT']}><Layout /></Guard>}>
              {/* admin */}
              <Route path="/admin" element={<Guard roles={['ADMIN']}><AdminDashboard /></Guard>} />
              <Route path="/admin/students" element={<Guard roles={['ADMIN']}><Students /></Guard>} />
              <Route path="/admin/wardens" element={<Guard roles={['ADMIN']}><Wardens /></Guard>} />
              <Route path="/admin/rooms" element={<Guard roles={['ADMIN']}><Rooms /></Guard>} />
              <Route path="/admin/bills" element={<Guard roles={['ADMIN']}><Bills /></Guard>} />
              <Route path="/admin/attendance" element={<Guard roles={['ADMIN']}><AdminAttendance /></Guard>} />
              <Route path="/admin/outpass" element={<Guard roles={['ADMIN']}><Outpass /></Guard>} />
              <Route path="/admin/mess" element={<Guard roles={['ADMIN']}><Mess /></Guard>} />
              <Route path="/admin/complaints" element={<Guard roles={['ADMIN']}><Complaints /></Guard>} />
              {/* warden */}
              <Route path="/warden" element={<Guard roles={['WARDEN']}><WardenDashboard /></Guard>} />
              <Route path="/warden/attendance" element={<Guard roles={['WARDEN']}><WardenAttendance /></Guard>} />
              <Route path="/warden/outpass" element={<Guard roles={['WARDEN']}><Outpass /></Guard>} />
              <Route path="/warden/bills" element={<Guard roles={['WARDEN']}><Bills readonly /></Guard>} />
              <Route path="/warden/mess" element={<Guard roles={['WARDEN']}><Mess /></Guard>} />
              <Route path="/warden/complaints" element={<Guard roles={['WARDEN']}><Complaints /></Guard>} />
              {/* student */}
              <Route path="/student" element={<Guard roles={['STUDENT']}><StudentDashboard /></Guard>} />
              <Route path="/student/bills" element={<Guard roles={['STUDENT']}><Bills /></Guard>} />
              <Route path="/student/outpass" element={<Guard roles={['STUDENT']}><Outpass /></Guard>} />
              <Route path="/student/attendance" element={<Guard roles={['STUDENT']}><StudentAttendance /></Guard>} />
              <Route path="/student/mess" element={<Guard roles={['STUDENT']}><Mess /></Guard>} />
              <Route path="/student/complaints" element={<Guard roles={['STUDENT']}><Complaints /></Guard>} />
              {/* shared */}
              <Route path="/app/notices" element={<Notices />} />
              <Route path="/app/visitors" element={<Guard roles={['ADMIN', 'WARDEN']}><Visitors /></Guard>} />
              <Route path="/app/maintenance" element={<Maintenance />} />
              <Route path="/app/laundry" element={<Laundry />} />
              <Route path="/app/room-requests" element={<RoomRequests />} />
              <Route path="/app/leaves" element={<Leaves />} />
              <Route path="/app/events" element={<Events />} />
              <Route path="/app/reports" element={<Guard roles={['ADMIN']}><Reports /></Guard>} />
              <Route path="/app/profile" element={<Profile />} />
              <Route path="/app/search" element={<SearchPage />} />
              <Route path="/app/sos" element={<SOS />} />
              <Route path="/app/wall" element={<Wall />} />
              <Route path="/app/audit" element={<Guard roles={['ADMIN']}><Audit /></Guard>} />
              <Route path="/" element={<Home />} />
              <Route path="*" element={<div className="glass rounded-2xl p-8 text-center">404 — page not found</div>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <Navigate to={user.role === 'ADMIN' ? '/admin' : user.role === 'WARDEN' ? '/warden' : '/student'} />;
}
export { toastRef };
