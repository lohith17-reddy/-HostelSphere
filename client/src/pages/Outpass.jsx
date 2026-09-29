import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api, { errMsg } from '../api.js';
import { Badge, toneFor, Empty, Skeleton, Modal, Field, inputCls, btnPrimary, btnGhost, toast } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Outpass() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState(null);
  const [form, setForm] = useState({ reason: '', destination: '', out_datetime: '', return_datetime: '', parent_contact: '', emergency: false });
  const [remark, setRemark] = useState('');
  const load = () => api.get('/outpass', { params: filter ? { status: filter } : {} }).then((r) => setRows(r.data.data));
  useEffect(() => { load(); }, [filter]);

  const apply = async (e) => {
    e.preventDefault();
    try { await api.post('/outpass', form); toast('Outpass applied'); setOpen(false); load(); }
    catch (ex) { toast(errMsg(ex), 'err'); }
  };
  const decide = async (id, action) => {
    try { await api.post(`/outpass/${id}/decide`, { action, remarks: remark }); toast(`Outpass ${action}`); setRemark(''); load(); }
    catch (ex) { toast(errMsg(ex), 'err'); }
  };
  if (!rows) return <Skeleton rows={4} />;
  return (
    <div className="space-y-3 fade-in">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Outpass</h1>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls + ' !w-auto'}><option value="">All</option>{['Pending', 'Approved', 'Rejected', 'CheckedOut', 'Returned'].map((s) => <option key={s}>{s}</option>)}</select>
          {isStudent && <button onClick={() => setOpen(true)} className={btnPrimary}>+ Apply</button>}
        </div>
      </div>
      {!rows.length && <Empty text="No outpasses yet" />}
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((o) => (
          <div key={o.id} className={`glass rounded-2xl p-4 card-hover ${o.emergency ? 'ring-2 ring-red-500' : ''}`}>
            <div className="flex justify-between items-start gap-2">
              <div><b>{o.student_name}</b> {o.emergency && <Badge tone="red">EMERGENCY</Badge>}
                <div className="text-xs opacity-70">{o.reason} → {o.destination} · Block {o.block}</div>
                <div className="text-xs opacity-70">Out: {o.out_datetime} · Return: {o.return_datetime}</div>
                {o.remarks && <div className="text-xs mt-1">💬 {o.remarks}</div>}</div>
              <Badge tone={toneFor(o.status)}>{o.status}</Badge>
            </div>
            {/* timeline */}
            <div className="text-xs mt-2 opacity-70">Pending → {o.status}{o.late ? ' · ⚠️ LATE return' : ''}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {(o.status === 'Approved' || o.status === 'CheckedOut') && <button onClick={() => setQr(o)} className={btnGhost}>QR Pass</button>}
              {!isStudent && o.status === 'Pending' && (
                <><input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Remarks" className={inputCls + ' !w-40'} />
                  <button onClick={() => decide(o.id, 'Approved')} className={btnPrimary}>Approve</button>
                  <button onClick={() => decide(o.id, 'Rejected')} className={btnGhost}>Reject</button></>
              )}
              {!isStudent && o.status === 'Approved' && <button onClick={() => api.post(`/outpass/${o.id}/checkout`).then(load)} className={btnGhost}>Check out</button>}
              {!isStudent && (o.status === 'CheckedOut' || o.status === 'Approved') && <button onClick={() => api.post(`/outpass/${o.id}/return`).then(load)} className={btnGhost}>Mark returned</button>}
            </div>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Apply for outpass">
        <form onSubmit={apply} className="space-y-2">
          <Field label="Reason"><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputCls} required /></Field>
          <Field label="Destination"><input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={inputCls} required /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Out date/time"><input type="datetime-local" value={form.out_datetime} onChange={(e) => setForm({ ...form, out_datetime: e.target.value })} className={inputCls} required /></Field>
            <Field label="Return date/time"><input type="datetime-local" value={form.return_datetime} onChange={(e) => setForm({ ...form, return_datetime: e.target.value })} className={inputCls} required /></Field>
          </div>
          <Field label="Parent contact (optional)"><input value={form.parent_contact} onChange={(e) => setForm({ ...form, parent_contact: e.target.value })} className={inputCls} /></Field>
          <label className="text-sm flex gap-2 items-center"><input type="checkbox" checked={form.emergency} onChange={(e) => setForm({ ...form, emergency: e.target.checked })} /> Emergency outpass</label>
          <button className={btnPrimary + ' w-full'}>Submit</button>
        </form>
      </Modal>
      <Modal open={!!qr} onClose={() => setQr(null)} title="Digital Gate Pass">
        {qr && <div className="text-center space-y-2">
          <QRCodeSVG value={JSON.stringify({ outpass: qr.id, student: qr.student_name, dest: qr.destination, out: qr.out_datetime, ret: qr.return_datetime })} size={200} className="mx-auto bg-white p-2 rounded-xl" />
          <div className="text-sm"><b>{qr.student_name}</b> → {qr.destination}<br />{qr.out_datetime} → {qr.return_datetime}</div>
          <div className="text-xs opacity-60">Show at gate · ID #{qr.id}</div>
        </div>}
      </Modal>
    </div>
  );
}
