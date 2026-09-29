import { useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import { Badge, Empty, Skeleton, Modal, Field, inputCls, btnPrimary, btnGhost, toast, toCSV, Confirm } from '../components/UI.jsx';

export function Students() {
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState({ search: '', block: '', page: 1 });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', roll_no: '', department: 'CSE', year: 1, block: 'A', floor: 1, room_no: '', phone: '' });
  const [del, setDel] = useState(null);
  const load = () => api.get('/admin/students', { params: { ...q, limit: 15 } }).then((r) => { setRows(r.data.data); setTotal(r.data.total); });
  useEffect(() => { load(); }, [q.page, q.block]);
  const search = (e) => { e.preventDefault(); setQ({ ...q, page: 1 }); load(); };
  const create = async (e) => {
    e.preventDefault();
    try { await api.post('/admin/students', form); toast('Student added'); setOpen(false); load(); }
    catch (ex) { toast(errMsg(ex), 'err'); }
  };
  if (!rows) return <Skeleton rows={5} />;
  return (
    <div className="space-y-3 fade-in">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Students ({total})</h1>
        <div className="flex gap-2">
          <button onClick={() => toCSV(rows, 'students.csv')} className={btnGhost}>CSV</button>
          <button onClick={() => setOpen(true)} className={btnPrimary}>+ Add</button>
        </div>
      </div>
      <form onSubmit={search} className="flex gap-2">
        <input value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value })} placeholder="Search name/roll/email…" className={inputCls} />
        <select value={q.block} onChange={(e) => setQ({ ...q, block: e.target.value, page: 1 })} className={inputCls + ' !w-auto'}><option value="">All blocks</option>{['A', 'B', 'C', 'D', 'E'].map((b) => <option key={b}>{b}</option>)}</select>
        <button className={btnPrimary}>Go</button>
      </form>
      {!rows.length && <Empty />}
      <div className="glass rounded-2xl divide-y text-sm max-h-[60vh] overflow-auto">
        {rows.map((s) => <div key={s.id} className="p-2.5 flex gap-2 items-center flex-wrap">
          <img src={`https://i.pravatar.cc/40?u=${s.email}`} className="w-8 h-8 rounded-full" alt="" />
          <div className="flex-1 min-w-[180px]"><b>{s.name}</b> <span className="opacity-60">{s.roll_no} · {s.department} Y{s.year}</span><div className="text-xs opacity-60">{s.email} · Block {s.block} · Room {s.room_no}</div></div>
          <button onClick={() => setDel(s)} className="text-red-500 text-xs">Delete</button>
        </div>)}
      </div>
      <div className="flex gap-2"><button disabled={q.page <= 1} onClick={() => setQ({ ...q, page: q.page - 1 })} className={btnGhost}>Prev</button><span className="text-sm py-2">Page {q.page}</span><button onClick={() => setQ({ ...q, page: q.page + 1 })} className={btnGhost}>Next</button></div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add student">
        <form onSubmit={create} className="grid grid-cols-2 gap-2">
          {[['name', 'Full name'], ['email', 'Email'], ['roll_no', 'Roll no'], ['phone', 'Phone'], ['room_no', 'Room no']].map(([k, l]) => (
            <Field key={k} label={l}><input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={inputCls} required={['name', 'email', 'roll_no'].includes(k)} /></Field>
          ))}
          <Field label="Department"><select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputCls}>{['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT'].map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Block"><select value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} className={inputCls}>{['A', 'B', 'C', 'D', 'E'].map((b) => <option key={b}>{b}</option>)}</select></Field>
          <button className={btnPrimary + ' col-span-2'}>Create (password: Student@123)</button>
        </form>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} text={`Delete ${del?.name}?`} onYes={() => api.delete(`/admin/students/${del.id}`).then(() => { setDel(null); load(); })} />
    </div>
  );
}

export function Wardens() {
  const [rows, setRows] = useState(null);
  const load = () => api.get('/admin/wardens').then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, []);
  if (!rows) return <Skeleton rows={4} />;
  return (
    <div className="space-y-3 fade-in"><h1 className="font-heading text-2xl font-bold">Wardens</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((w) => <div key={w.id} className="glass rounded-2xl p-4"><b>{w.name}</b> <Badge tone="blue">Block {w.block}</Badge><div className="text-xs opacity-70">{w.email} · {w.phone}</div></div>)}
      </div></div>
  );
}

export function Rooms() {
  const [rows, setRows] = useState(null);
  const [block, setBlock] = useState('');
  useEffect(() => { api.get('/admin/rooms', { params: block ? { block } : {} }).then((r) => setRows(r.data.data)); }, [block]);
  if (!rows) return <Skeleton rows={5} />;
  const color = { occupied: 'bg-red-400', vacant: 'bg-green-400', maintenance: 'bg-yellow-400' };
  return (
    <div className="space-y-3 fade-in">
      <div className="flex gap-2 items-center"><h1 className="font-heading text-2xl font-bold flex-1">Room Grid Map</h1>
        <select value={block} onChange={(e) => setBlock(e.target.value)} className={inputCls + ' !w-auto'}><option value="">All blocks</option>{['A', 'B', 'C', 'D', 'E'].map((b) => <option key={b}>Block {b}</option>)}</select></div>
      <div className="flex gap-3 text-xs"><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" />occupied</span><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" />vacant</span><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400" />maintenance</span></div>
      {['A', 'B', 'C', 'D', 'E'].filter((b) => !block || block === 'Block ' + b || block === b).map((b) => (
        <div key={b} className="glass rounded-2xl p-3"><b>Block {b}</b>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 mt-2">
            {rows.filter((r) => r.block === b).map((r) => (
              <button key={r.id} title={`${r.room_no}: ${r.occupied}/${r.capacity}`} onClick={() => { if (confirm(`Toggle maintenance for ${r.block}-${r.room_no}?`)) api.post(`/admin/rooms/${r.id}/maintenance`, { status: r.status === 'maintenance' ? 'vacant' : 'maintenance' }).then(() => api.get('/admin/rooms', { params: block ? { block } : {} }).then((x) => setRows(x.data.data))); }}
                className={`${color[r.status]} text-white rounded-xl p-2 text-xs font-bold`}>{r.room_no}<div className="font-normal">{r.occupied}/{r.capacity}</div></button>
            ))}
          </div></div>
      ))}
    </div>
  );
}
