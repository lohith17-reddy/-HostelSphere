import { useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import { Badge, toneFor, Empty, Skeleton, Modal, Field, inputCls, btnPrimary, btnGhost, toast } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const CATS = ['Food', 'Room', 'Cleanliness', 'Electricity', 'Water', 'WiFi', 'Staff', 'Security', 'Other'];

export default function Complaints() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ type: 'complaint', category: 'Food', description: '', priority: 'Medium', anonymous: false });
  const load = () => api.get('/complaints').then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/complaints', form); toast('Submitted'); setOpen(false); setForm({ ...form, description: '' }); load(); }
    catch (ex) { toast(errMsg(ex), 'err'); }
  };
  const openThread = async (c) => {
    setThread(c);
    const r = await api.get(`/complaints/${c.id}/comments`);
    setComments(r.data.data);
  };
  const send = async () => {
    await api.post(`/complaints/${thread.id}/comments`, { message: msg });
    setMsg(''); openThread(thread); load();
  };
  if (!rows) return <Skeleton rows={4} />;
  return (
    <div className="space-y-3 fade-in">
      <div className="flex justify-between items-center"><h1 className="font-heading text-2xl font-bold">Complaints & Compliments</h1>
        {isStudent && <button onClick={() => setOpen(true)} className={btnPrimary}>+ New</button>}</div>
      {!rows.length && <Empty />}
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((c) => (
          <div key={c.id} className="glass rounded-2xl p-4 card-hover">
            <div className="flex justify-between gap-2"><div><b>#{c.id} {c.category}</b> {c.escalated && <Badge tone="red">ESCALATED</Badge>}
              <div className="text-xs opacity-60">{c.type} · {c.author || 'student'} · {c.created_at?.slice(0, 10)} · {c.priority}</div>
              <p className="text-sm mt-1">{c.description}</p></div>
              <div className="flex flex-col gap-1 items-end"><Badge tone={toneFor(c.status)}>{c.status}</Badge><Badge tone="gray">{c.type}</Badge></div></div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={() => openThread(c)} className={btnGhost}>Thread / Reply</button>
              {!isStudent && c.status !== 'Resolved' && (
                <><button onClick={() => api.post(`/complaints/${c.id}/status`, { status: 'In Progress' }).then(load)} className={btnGhost}>In Progress</button>
                  <button onClick={() => api.post(`/complaints/${c.id}/status`, { status: 'Resolved' }).then(load)} className={btnPrimary}>Resolve</button></>
              )}
              {isStudent && c.status === 'Resolved' && [4, 5].map((s) => <button key={s} onClick={() => api.post(`/complaints/${c.id}/rate`, { satisfaction: s }).then(() => toast('Thanks!'))} className={btnGhost}>⭐{s}</button>)}
            </div>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New complaint / compliment">
        <form onSubmit={submit} className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}><option value="complaint">Complaint</option><option value="compliment">Compliment</option></select></Field>
            <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}><option>Low</option><option>Medium</option><option>High</option></select></Field>
          </div>
          <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows="3" required /></Field>
          <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} /> Post anonymously</label>
          <button className={btnPrimary + ' w-full'}>Submit</button>
        </form>
      </Modal>
      <Modal open={!!thread} onClose={() => setThread(null)} title={`Ticket #${thread?.id} thread`}>
        <div className="space-y-2 text-sm max-h-64 overflow-auto mb-2">
          {comments.map((c) => <div key={c.id} className="bg-black/5 dark:bg-white/5 rounded-xl p-2"><b>{c.name} ({c.role})</b><div>{c.message}</div></div>)}
          {!comments.length && <div className="opacity-60">No replies yet.</div>}
        </div>
        <div className="flex gap-2"><input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a reply…" className={inputCls} /><button onClick={send} className={btnPrimary}>Send</button></div>
      </Modal>
    </div>
  );
}
