import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@hostel.com');
  const [password, setPassword] = useState('Admin@123');
  const [role, setRole] = useState('Admin');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : user.role === 'WARDEN' ? '/warden' : '/student'} />;

  const fill = (r) => {
    setRole(r);
    if (r === 'Admin') { setEmail('admin@hostel.com'); setPassword('Admin@123'); }
    if (r === 'Warden') { setEmail('warden1@hostel.com'); setPassword('Warden@123'); }
    if (r === 'Student') { setEmail('student1@hostel.com'); setPassword('Student@123'); }
  };
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const u = await login(email, password);
      nav(u.role === 'ADMIN' ? '/admin' : u.role === 'WARDEN' ? '/warden' : '/student');
    } catch (ex) {
      if (!ex?.response) setErr('Cannot reach the server. Start the backend first: in /server run "npm run dev" (http://localhost:5000), then retry.');
      else setErr(errMsg(ex, 'Login failed'));
    } finally { setLoading(false); }
  };
  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 w-full max-w-md fade-in">
        <h1 className="font-heading text-3xl font-bold">🏠 Hostel<span className="text-amber-500">Sphere</span></h1>
        <p className="text-sm opacity-70 mb-4">Hostel Management System · Admin / Warden / Student</p>
        <div className="flex gap-2 mb-4">
          {['Student', 'Warden', 'Admin'].map((r) => (
            <button key={r} onClick={() => fill(r)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${role === r ? 'bg-amber-500 text-white' : 'border border-black/10 dark:border-white/15'}`}>{r}</button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2.5 rounded-xl border bg-white/70 dark:bg-black/30 text-sm" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full px-3 py-2.5 rounded-xl border bg-white/70 dark:bg-black/30 text-sm" />
          {err && <div className="text-red-500 text-sm">{err}</div>}
          <button disabled={loading} className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold">{loading ? 'Signing in…' : 'Login'}</button>
        </form>
        <div className="mt-4 text-xs opacity-80 bg-black/5 dark:bg-white/5 rounded-xl p-3">
          <b>Demo credentials</b><br />Admin: admin@hostel.com / Admin@123<br />Warden: warden1@hostel.com … warden5@hostel.com / Warden@123<br />Student: student1@hostel.com … student55@hostel.com / Student@123
        </div>
      </div>
    </div>
  );
}
