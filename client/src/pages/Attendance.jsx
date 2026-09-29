import { useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import { Badge, toneFor, Skeleton, btnPrimary, btnGhost, inputCls, toast, toCSV } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const today = () => new Date().toISOString().slice(0, 10);

export function WardenAttendance() {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState(null);
  const [sel, setSel] = useState({});
  const load = () => api.get('/attendance', { params: { date } }).then((r) => {
    setRows(r.data.data);
    const m = {}; r.data.data.forEach((s) => { m[s.id] = s.attendance || 'present'; }); setSel(m);
  });
  useEffect(() => { load(); }, [date]);
  const save = async () => {
    try {
      const records = Object.entries(sel).map(([student_id, status]) => ({ student_id: +student_id, status }));
      const r = await api.post('/attendance/mark', { date, records });
      toast(`Marked ${r.data.data.count}` + (r.data.data.streakAlerts.length ? ` · ${r.data.data.streakAlerts.length} streak alerts sent!` : ''));
      load();
    } catch (e) { toast(errMsg(e), 'err'); }
  };
  if (!rows) return <Skeleton rows={6} />;
  return (
    <div className="space-y-3 fade-in">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Night Attendance — {date}</h1>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls + ' !w-auto'} />
          <button onClick={() => { const m = {}; rows.forEach((s) => (m[s.id] = 'present')); setSel(m); }} className={btnGhost}>Mark all present</button>
          <button onClick={save} className={btnPrimary}>Save</button>
        </div>
      </div>
      <div className="glass rounded-2xl divide-y max-h-[65vh] overflow-auto">
        {rows.map((s) => (
          <div key={s.id} className="flex items-center gap-2 p-2.5 text-sm flex-wrap">
            <img src={s.avatar || `https://i.pravatar.cc/40?u=${s.email}`} className="w-8 h-8 rounded-full" alt="" />
            <div className="flex-1 min-w-[140px]"><b>{s.name}</b><div className="text-xs opacity-60">{s.roll_no} · {s.block}-{s.room_no}</div></div>
            {['present', 'absent', 'on-leave', 'on-outpass'].map((st) => (
              <button key={st} onClick={() => setSel({ ...sel, [s.id]: st })} className={`px-2 py-1 rounded-lg text-xs font-semibold ${sel[s.id] === st ? 'bg-amber-500 text-white' : 'border'}`}>{st}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudentAttendance() {
  const [d, setD] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  useEffect(() => { api.get('/attendance', { params: { month } }).then((r) => setD(r.data.data)); }, [month]);
  if (!d) return <Skeleton rows={4} />;
  // calendar grid
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const map = Object.fromEntries(d.rows.map((r) => [r.date, r.status]));
  const colors = { present: 'bg-green-400', absent: 'bg-red-400', 'on-leave': 'bg-yellow-400', 'on-outpass': 'bg-blue-400' };
  return (
    <div className="space-y-3 fade-in">
      <h1 className="font-heading text-2xl font-bold">My Attendance — {d.pct}%</h1>
      <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls + ' !w-auto'} />
      <div className="glass rounded-2xl p-4 grid grid-cols-7 gap-1 text-center text-xs">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => <b key={i} className="opacity-60">{w}</b>)}
        {Array.from({ length: first }).map((_, i) => <div key={'e' + i} />)}
        {Array.from({ length: days }).map((_, i) => {
          const ds = `${month}-${String(i + 1).padStart(2, '0')}`;
          return <div key={ds} title={map[ds] || ''} className={`rounded-lg p-2 ${map[ds] ? colors[map[ds]] + ' text-white' : 'bg-black/5 dark:bg-white/5'}`}>{i + 1}</div>;
        })}
      </div>
      <div className="flex gap-3 text-xs">{Object.entries(colors).map(([k, c]) => <span key={k} className="flex items-center gap-1"><span className={`w-3 h-3 rounded ${c}`} />{k}</span>)}</div>
    </div>
  );
}

export function AdminAttendance() {
  const { } = useAuth();
  const [d, setD] = useState(null);
  const [f, setF] = useState({ block: '' });
  useEffect(() => { api.get('/attendance/report', { params: f }).then((r) => setD(r.data.data)); }, []);
  const load = () => api.get('/attendance/report', { params: f }).then((r) => setD(r.data.data));
  if (!d) return <Skeleton rows={5} />;
  return (
    <div className="space-y-3 fade-in">
      <div className="flex gap-2 items-center"><h1 className="font-heading text-2xl font-bold flex-1">Attendance Report — {d.pct}%</h1>
        <select value={f.block} onChange={(e) => setF({ block: e.target.value })} className={inputCls + ' !w-auto'}><option value="">All blocks</option>{['A', 'B', 'C', 'D', 'E'].map((b) => <option key={b}>{b}</option>)}</select>
        <button onClick={load} className={btnPrimary}>Filter</button>
        <button onClick={() => toCSV(d.rows, 'attendance.csv')} className={btnGhost}>CSV</button></div>
      <div className="glass rounded-2xl max-h-[60vh] overflow-auto divide-y text-sm">
        {d.rows.slice(0, 300).map((r) => <div key={r.id} className="p-2 flex gap-2 items-center"><span className="flex-1">{r.date} · {r.name} ({r.block})</span><Badge tone={toneFor(r.status)}>{r.status}</Badge></div>)}
      </div>
    </div>
  );
}
