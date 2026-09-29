// Extra features: notices, visitors, maintenance, laundry, room-req, leaves, events, reports, profile/ID, search, sos, wall, audit
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api, { errMsg } from '../api.js';
import { Badge, toneFor, Empty, Skeleton, Modal, Field, inputCls, btnPrimary, btnGhost, toast, toCSV } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Notices() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', target: 'all', pinned: false });
  const load = () => api.get('/notices').then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, []);
  if (!rows) return <Skeleton rows={3} />;
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Notice Board</h1>
      {(user?.role !== 'STUDENT') && (
        <form onSubmit={(e) => { e.preventDefault(); api.post('/notices', form).then(() => { toast('Posted'); setForm({ title: '', body: '', target: 'all', pinned: false }); load(); }); }} className="glass rounded-2xl p-3 grid md:grid-cols-4 gap-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className={inputCls} required />
          <input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Body" className={inputCls} required />
          <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className={inputCls}><option value="all">All</option><option value="block:A">Block A</option><option value="block:B">Block B</option><option value="block:C">Block C</option><option value="block:D">Block D</option><option value="block:E">Block E</option></select>
          <button className={btnPrimary}>Post</button>
        </form>)}
      {rows.map((n) => <div key={n.id} className="glass rounded-2xl p-4">{n.pinned && <Badge tone="amber">📌 Pinned</Badge>} <b>{n.title}</b> <Badge tone="gray">{n.target}</Badge><div className="text-sm opacity-80">{n.body}</div><div className="text-xs opacity-60">{n.author} · {n.created_at?.slice(0, 10)}</div></div>)}
      {!rows.length && <Empty />}</div>
  );
}

export function Visitors() {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', purpose: '' });
  const load = () => api.get('/visitors').then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, []);
  if (!rows) return <Skeleton rows={3} />;
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Visitor Management</h1>
      <form onSubmit={(e) => { e.preventDefault(); api.post('/visitors', form).then(() => { toast('Logged'); setForm({ name: '', phone: '', purpose: '' }); load(); }); }} className="glass rounded-2xl p-3 flex gap-2 flex-wrap">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Visitor name" className={inputCls + ' !w-40'} required />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className={inputCls + ' !w-32'} />
        <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Purpose" className={inputCls + ' !w-40'} />
        <button className={btnPrimary}>Log in</button></form>
      <div className="glass rounded-2xl divide-y text-sm">{rows.map((v) => <div key={v.id} className="p-2 flex gap-2 items-center flex-wrap"><b className="flex-1">{v.name} → {v.student_name || '—'} ({v.purpose})</b><span className="opacity-60 text-xs">in {v.in_time?.slice(0, 16)} {v.out_time ? `· out ${v.out_time.slice(0, 16)}` : ''}</span>{!v.out_time && <button onClick={() => api.post(`/visitors/${v.id}/out`).then(load)} className={btnGhost}>Out</button>}</div>)}</div></div>
  );
}

export function Maintenance() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ block: 'A', room_no: '', issue: '', category: 'General' });
  const load = () => api.get('/maintenance').then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, []);
  if (!rows) return <Skeleton rows={3} />;
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Maintenance</h1>
      <form onSubmit={(e) => { e.preventDefault(); api.post('/maintenance', form).then(() => { toast('Raised'); load(); }).catch((ex) => toast(errMsg(ex), 'err')); }} className="glass rounded-2xl p-3 flex gap-2 flex-wrap">
        <select value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} className={inputCls + ' !w-24'}>{['A', 'B', 'C', 'D', 'E'].map((b) => <option key={b}>{b}</option>)}</select>
        <input value={form.room_no} onChange={(e) => setForm({ ...form, room_no: e.target.value })} placeholder="Room" className={inputCls + ' !w-24'} required />
        <input value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} placeholder="Issue" className={inputCls + ' !w-56'} required />
        <button className={btnPrimary}>Raise</button></form>
      <div className="grid md:grid-cols-2 gap-2">{rows.map((m) => <div key={m.id} className="glass rounded-2xl p-3 text-sm"><b>{m.block}-{m.room_no}: {m.issue}</b><div className="opacity-70">{m.category} · {m.technician || 'unassigned'}</div><div className="flex gap-2 mt-1 items-center"><Badge tone={toneFor(m.status)}>{m.status}</Badge>
        {user?.role !== 'STUDENT' && <><button onClick={() => api.post(`/maintenance/${m.id}/assign`, { technician: 'Ravi (Electrician)', status: 'Assigned' }).then(load)} className={btnGhost}>Assign</button><button onClick={() => api.post(`/maintenance/${m.id}/assign`, { status: 'Fixed' }).then(load)} className={btnGhost}>Fixed</button></>}</div></div>)}</div></div>
  );
}

export function Laundry() {
  const [d, setD] = useState(null);
  const load = () => api.get('/laundry').then((r) => setD(r.data.data));
  useEffect(() => { load(); }, []);
  if (!d) return <Skeleton rows={4} />;
  const days = [...new Set(d.slots.map((s) => s.day))];
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Laundry Slot Booking</h1>
      {days.map((day) => <div key={day} className="glass rounded-2xl p-3"><b>{day}</b><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
        {d.slots.filter((s) => s.day === day).map((s) => <button key={s.id} disabled={d.mine.includes(s.id) || s.booked >= s.capacity} onClick={() => api.post(`/laundry/${s.id}/book`).then(() => { toast('Booked'); load(); }).catch((e) => toast(errMsg(e), 'err'))}
          className={`rounded-xl p-2 text-xs font-semibold ${d.mine.includes(s.id) ? 'bg-green-500 text-white' : s.booked >= s.capacity ? 'bg-red-200' : 'border hover:bg-amber-100'}`}>{s.slot}<div>{s.booked}/{s.capacity}</div></button>)}</div></div>)}</div>
  );
}

export function RoomRequests() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ to_block: 'B', to_room: '', reason: '' });
  const load = () => api.get('/room-requests').then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, []);
  if (!rows) return <Skeleton rows={3} />;
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Room Change Requests</h1>
      {user?.role === 'STUDENT' && <form onSubmit={(e) => { e.preventDefault(); api.post('/room-requests', form).then(() => { toast('Requested'); load(); }); }} className="glass rounded-2xl p-3 flex gap-2 flex-wrap">
        <select value={form.to_block} onChange={(e) => setForm({ ...form, to_block: e.target.value })} className={inputCls + ' !w-28'}>{['A', 'B', 'C', 'D', 'E'].map((b) => <option key={b}>{b}</option>)}</select>
        <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason" className={inputCls + ' !w-64'} required /><button className={btnPrimary}>Request</button></form>}
      {rows.map((r) => <div key={r.id} className="glass rounded-2xl p-3 text-sm"><b>{r.name}: {r.from_room} → {r.to_block}-{r.to_room || '?'}</b><div className="opacity-70">{r.reason}</div><div className="flex gap-2 mt-1 items-center"><Badge tone={toneFor(r.status)}>{r.status}</Badge>
        {user?.role === 'WARDEN' && r.status === 'Pending' && <button onClick={() => api.post(`/room-requests/${r.id}/decide`, { action: 'WardenApproved' }).then(load)} className={btnGhost}>Warden approve</button>}
        {user?.role === 'ADMIN' && <button onClick={() => api.post(`/room-requests/${r.id}/decide`, { action: 'Approved' }).then(load)} className={btnPrimary}>Admin approve</button>}</div></div>)}
      {!rows.length && <Empty />}</div>
  );
}

export function Leaves() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ reason: '', from_date: '', to_date: '' });
  const load = () => api.get('/leaves').then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, []);
  if (!rows) return <Skeleton rows={3} />;
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Long Leave</h1>
      {user?.role === 'STUDENT' && <form onSubmit={(e) => { e.preventDefault(); api.post('/leaves', form).then(() => { toast('Applied'); load(); }); }} className="glass rounded-2xl p-3 flex gap-2 flex-wrap">
        <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason" className={inputCls + ' !w-56'} required />
        <input type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} className={inputCls + ' !w-auto'} required />
        <input type="date" value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} className={inputCls + ' !w-auto'} required />
        <button className={btnPrimary}>Apply</button></form>}
      {rows.map((l) => <div key={l.id} className="glass rounded-2xl p-3 text-sm"><b>{l.name}: {l.reason}</b><div className="opacity-70">{l.from_date} → {l.to_date}</div><div className="flex gap-2 mt-1 items-center"><Badge tone={toneFor(l.status)}>{l.status}</Badge>
        {user?.role !== 'STUDENT' && l.status === 'Pending' && <><button onClick={() => api.post(`/leaves/${l.id}/decide`, { action: 'Approved' }).then(load)} className={btnPrimary}>Approve</button><button onClick={() => api.post(`/leaves/${l.id}/decide`, { action: 'Rejected' }).then(load)} className={btnGhost}>Reject</button></>}</div></div>)}
      {!rows.length && <Empty />}</div>
  );
}

export function Events() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ title: '', date: '', kind: 'event' });
  const load = () => api.get('/events').then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, []);
  if (!rows) return <Skeleton rows={3} />;
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Events & Holidays</h1>
      {user?.role !== 'STUDENT' && <form onSubmit={(e) => { e.preventDefault(); api.post('/events', form).then(() => { toast('Added'); load(); }); }} className="glass rounded-2xl p-3 flex gap-2">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className={inputCls} required />
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls + ' !w-auto'} required />
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={inputCls + ' !w-auto'}><option value="event">event</option><option value="holiday">holiday</option></select>
        <button className={btnPrimary}>Add</button></form>}
      <div className="grid md:grid-cols-2 gap-2">{rows.map((e, i) => <div key={i} className="glass rounded-2xl p-3 text-sm"><b>{e.title}</b> <Badge tone={e.kind === 'holiday' ? 'red' : 'blue'}>{e.kind}</Badge><div className="opacity-70">{e.date}</div></div>)}</div></div>
  );
}

export function Reports() {
  const [kind, setKind] = useState('fees');
  const [rows, setRows] = useState([]);
  const load = () => api.get(`/reports/${kind}`).then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, [kind]);
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Reports Center</h1>
      <div className="flex gap-2"><select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls + ' !w-auto'}><option value="fees">Fees</option><option value="attendance">Attendance</option><option value="mess">Mess</option><option value="complaints">Complaints</option></select>
        <button onClick={() => toCSV(rows, `${kind}.csv`)} className={btnPrimary}>Export CSV ({rows.length})</button></div>
      <div className="glass rounded-2xl p-3 text-xs max-h-[60vh] overflow-auto"><pre>{JSON.stringify(rows.slice(0, 5), null, 1)}{rows.length > 5 ? `\n… +${rows.length - 5} more` : ''}</pre></div></div>
  );
}

export function Profile() {
  const { user, setUser } = useAuth();
  const [d, setD] = useState(null);
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '' });
  useEffect(() => { api.get('/profile').then((r) => { setD(r.data.data); setUser(r.data.data); }); }, []);
  if (!d) return <Skeleton rows={3} />;
  const st = d.student;
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Profile & Hostel ID</h1>
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-5 text-center">
          <b>Digital Hostel ID Card</b>
          <div className="mx-auto mt-2 max-w-xs border-2 border-amber-400 rounded-2xl p-4 bg-white text-gray-900">
            <div className="font-heading font-bold">🏠 HostelSphere ID</div>
            <img src={d.avatar || `https://i.pravatar.cc/80?u=${d.email}`} className="w-16 h-16 rounded-full mx-auto my-2" alt="" />
            <div className="font-bold">{d.name}</div>
            <div className="text-xs">{st ? `${st.roll_no} · ${st.department} Y${st.year}` : d.role} · Block {st?.block} · Room {st?.room_no}</div>
            {st && <QRCodeSVG value={JSON.stringify({ id: st.id, name: d.name, roll: st.roll_no, block: st.block, room: st.room_no })} size={120} className="mx-auto mt-2" />}
          </div>
          <button onClick={() => window.print()} className={btnGhost + ' mt-2'}>Print</button>
        </div>
        <div className="glass rounded-2xl p-4 text-sm space-y-1">
          <div><b>Email:</b> {d.email}</div><div><b>Role:</b> {d.role}</div><div><b>Phone:</b> {d.phone}</div>
          {st && <><div><b>Guardian:</b> {st.guardian_name} ({st.guardian_phone})</div></>}
          <form onSubmit={(e) => { e.preventDefault(); api.post('/auth/change-password', pw).then(() => toast('Password changed')).catch((ex) => toast(errMsg(ex), 'err')); }} className="pt-2 space-y-2">
            <b>Change password</b>
            <input type="password" value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} placeholder="Old password" className={inputCls} />
            <input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} placeholder="New password (8+ chars)" className={inputCls} />
            <button className={btnPrimary}>Update</button>
          </form>
        </div>
      </div></div>
  );
}

export function SearchPage() {
  const [params] = useSearchParams();
  const [d, setD] = useState(null);
  const q = params.get('q') || '';
  useEffect(() => { if (q) api.get('/search', { params: { q } }).then((r) => setD(r.data.data)); }, [q]);
  if (!d) return <Skeleton rows={3} />;
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Search: “{q}”</h1>
      {['students', 'rooms', 'bills', 'complaints'].map((k) => (
        <div key={k} className="glass rounded-2xl p-3"><b className="capitalize">{k} ({d[k]?.length || 0})</b>
          <pre className="text-xs overflow-auto max-h-48 mt-1">{JSON.stringify(d[k], null, 1)}</pre></div>))}
    </div>
  );
}

export function SOS() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => { if (user?.role !== 'STUDENT') api.get('/sos').then((r) => setRows(r.data.data)); };
  useEffect(load, []);
  if (user?.role === 'STUDENT') {
    return <div className="glass rounded-2xl p-6 text-center space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Emergency SOS</h1>
      <p className="text-sm opacity-70">Alerts your block warden + admin with your room details.</p>
      <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Optional message" className={inputCls} />
      <button onClick={() => api.post('/sos', { message: msg }).then(() => toast('SOS sent! Help is on the way.'))} className="px-8 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg animate-pulse">🚨 SEND SOS</button></div>;
  }
  if (!rows) return <Skeleton rows={3} />;
  return <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">SOS Alerts</h1>
    {rows.map((s) => <div key={s.id} className="glass rounded-2xl p-3 text-sm"><b>{s.name} — Block {s.block}, Room {s.room_no}</b> <Badge tone={s.status === 'Active' ? 'red' : 'green'}>{s.status}</Badge><div>{s.message} · {s.created_at}</div>{s.status === 'Active' && <button onClick={() => api.post(`/sos/${s.id}/resolve`).then(load)} className={btnPrimary + ' mt-1'}>Resolve</button>}</div>)}
    {!rows.length && <Empty text="No SOS alerts" />}</div>;
}

export function Wall() {
  const [rows, setRows] = useState(null);
  useEffect(() => { fetch('/api/complaints/wall').then((r) => r.json()).then((j) => setRows(j.data)); }, []);
  if (!rows) return <Skeleton rows={3} />;
  return <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">💛 Wall of Appreciation</h1>
    <div className="grid md:grid-cols-2 gap-3">{rows.map((c) => <div key={c.id} className="glass rounded-2xl p-4 border-l-4 border-l-amber-400"><div className="text-sm">“{c.description}”</div><div className="text-xs opacity-60 mt-1">— {c.anonymous ? 'Anonymous' : c.author} · {c.category}</div></div>)}</div>
    {!rows.length && <Empty text="No compliments yet — be the first!" />}</div>;
}

export function Audit() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get('/admin/audit').then((r) => setRows(r.data.data)); }, []);
  if (!rows) return <Skeleton rows={4} />;
  return <div className="space-y-3 fade-in"><div className="flex justify-between items-center"><h1 className="font-heading text-2xl font-bold">Activity Log</h1><button onClick={() => toCSV(rows, 'audit.csv')} className={btnGhost}>CSV</button></div>
    <div className="glass rounded-2xl divide-y text-xs max-h-[65vh] overflow-auto">{rows.map((a) => <div key={a.id} className="p-2">{a.created_at} · <b>{a.actor}</b> · {a.action} · {a.entity} {a.entity_id} · {a.detail}</div>)}</div></div>;
}
