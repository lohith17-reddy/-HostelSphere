import { useEffect, useState } from 'react';
import { Users, BedDouble, CalendarCheck, Receipt, DoorOpen, MessageSquareWarning } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../api.js';
import { Stat, Skeleton, Badge, toneFor } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AdminDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/admin/dashboard').then((r) => setD(r.data.data)); }, []);
  if (!d) return <Skeleton rows={6} />;
  return (
    <div className="space-y-3 fade-in">
      <h1 className="font-heading text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat icon={<Users size={20} />} label="Total Students" value={d.totalStudents} />
        <Stat icon={<BedDouble size={20} />} label="Rooms Occ/Vac" value={`${d.rooms.occ}/${d.rooms.vac}`} sub={`of ${d.rooms.total}`} />
        <Stat icon={<CalendarCheck size={20} />} label="Today Attendance" value={d.todayAtt + '%'} />
        <Stat icon={<Receipt size={20} />} label="Pending Fees" value={'₹' + Math.round(d.pendingFees.amt / 1000) + 'k'} sub={d.pendingFees.n + ' bills'} />
        <Stat icon={<DoorOpen size={20} />} label="Pending Outpass" value={d.pendingOut} />
        <Stat icon={<MessageSquareWarning size={20} />} label="Open Complaints" value={d.openComp} />
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4"><b>Monthly fee collection</b>
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.feesMonthly}><XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="total" fill="#f5b942" radius={6} /></BarChart></ResponsiveContainer></div>
        <div className="glass rounded-2xl p-4"><b>Block-wise occupancy</b>
          <ResponsiveContainer width="100%" height={220}><BarChart data={d.occupancy}><XAxis dataKey="block" /><YAxis /><Tooltip /><Bar dataKey="occ" fill="#3b82f6" radius={6} /><Bar dataKey="total" fill="#e5e7eb" radius={6} /></BarChart></ResponsiveContainer></div>
        <div className="glass rounded-2xl p-4"><b>Attendance trend</b>
          <ResponsiveContainer width="100%" height={220}><LineChart data={d.attTrend.map((r) => ({ ...r, pct: r.t ? Math.round((r.p / r.t) * 100) : 0 }))}><XAxis dataKey="date" fontSize={10} /><YAxis /><Tooltip /><Line dataKey="pct" stroke="#22c55e" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
        <div className="glass rounded-2xl p-4"><b>Complaint categories</b>
          <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={d.compCat} dataKey="n" nameKey="category" outerRadius={80} label>{d.compCat.map((_, i) => <Cell key={i} fill={['#f5b942', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#14b8a6'][i % 6]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
      </div>
    </div>
  );
}

export function WardenDashboard() {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  useEffect(() => {
    (async () => {
      const [stud, out, comp, sos] = await Promise.all([
        api.get('/attendance/my-students'), api.get('/outpass'), api.get('/complaints'), api.get('/sos').catch(() => ({ data: { data: [] } })),
      ]);
      setS({ students: stud.data.data.length, pendingOut: out.data.data.filter((o) => o.status === 'Pending').length, openComp: comp.data.data.filter((c) => c.status !== 'Resolved').length, sos: sos.data.data.filter((x) => x.status === 'Active').length, block: user?.warden?.block });
    })();
  }, []);
  if (!s) return <Skeleton rows={4} />;
  return (
    <div className="space-y-3 fade-in">
      <h1 className="font-heading text-2xl font-bold">Warden Dashboard — Block {s.block}</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Users size={20} />} label="My Students" value={s.students} />
        <Stat icon={<DoorOpen size={20} />} label="Pending Outpass" value={s.pendingOut} />
        <Stat icon={<MessageSquareWarning size={20} />} label="Open Complaints" value={s.openComp} />
        <Stat icon={<span>🚨</span>} label="Active SOS" value={s.sos} />
      </div>
      <div className="glass rounded-2xl p-4 text-sm">Mark night attendance daily, approve outpasses, log visitors, and watch the 3-day-absent alerts in notifications.</div>
    </div>
  );
}

export function StudentDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    (async () => {
      const [bills, att, out, notices] = await Promise.all([
        api.get('/bills'), api.get('/attendance'), api.get('/outpass'), api.get('/notices'),
      ]);
      setD({ bills: bills.data.data, att: att.data.data, out: out.data.data, notices: notices.data.data.slice(0, 3) });
    })();
  }, []);
  if (!d) return <Skeleton rows={4} />;
  const due = d.bills.filter((b) => b.status !== 'Paid').reduce((a, b) => a + b.amount + (b.fine || 0), 0);
  return (
    <div className="space-y-3 fade-in">
      <h1 className="font-heading text-2xl font-bold">Student Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Receipt size={20} />} label="Fees Due" value={'₹' + due.toLocaleString()} sub={d.bills.filter((b) => b.status !== 'Paid').length + ' pending'} />
        <Stat icon={<CalendarCheck size={20} />} label="Attendance" value={d.att.pct + '%'} sub={d.att.total + ' days'} />
        <Stat icon={<DoorOpen size={20} />} label="Outpasses" value={d.out.length} sub={d.out.filter((o) => o.status === 'Pending').length + ' pending'} />
        <Stat icon={<span>📌</span>} label="Notices" value={d.notices.length} />
      </div>
      <div className="glass rounded-2xl p-4"><b>Pinned notices</b>
        {d.notices.map((n) => <div key={n.id} className="mt-2 text-sm"><b>{n.title}</b> <Badge tone="amber">{n.target}</Badge><div className="opacity-80">{n.body}</div></div>)}
      </div>
    </div>
  );
}
