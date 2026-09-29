import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api, { errMsg } from '../api.js';
import { Badge, toneFor, Empty, Skeleton, Modal, Field, inputCls, btnPrimary, btnGhost, toast, toCSV } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function receiptPDF(pay, bill) {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text('HostelSphere — Payment Receipt', 14, 20);
  doc.setFontSize(11);
  doc.text(`Transaction ID: ${pay.transaction_id}`, 14, 32);
  doc.text(`Bill #${bill.id} (${bill.fee_type}) — ${bill.month}`, 14, 39);
  doc.text(`Amount: Rs.${pay.amount} via ${pay.method}`, 14, 46);
  doc.text(`Paid at: ${pay.paid_at}`, 14, 53);
  doc.text('Thank you! (Demo receipt, no real money moved.)', 14, 62);
  doc.save(`receipt-${pay.transaction_id}.pdf`);
}

export default function Bills({ readonly = false }) {
  const { user } = useAuth();
  const [bills, setBills] = useState(null);
  const [filter, setFilter] = useState('');
  const [payOpen, setPayOpen] = useState(null);
  const [method, setMethod] = useState('UPI');
  const [rev, setRev] = useState(null);
  const [gen, setGen] = useState({ fee_type: 'mess fee', amount: 4500, due_date: new Date().toISOString().slice(0, 10), month: new Date().toISOString().slice(0, 7) });
  const load = () => api.get('/bills').then((r) => setBills(r.data.data));
  useEffect(() => { load(); if (user?.role === 'ADMIN') api.get('/bills/revenue').then((r) => setRev(r.data.data)).catch(() => {}); }, []);
  const pay = async () => {
    try {
      const r = await api.post(`/bills/${payOpen.id}/pay`, { method });
      toast(`Paid! ${r.data.data.transaction_id}`);
      receiptPDF(r.data.data, payOpen);
      setPayOpen(null); load();
    } catch (e) { toast(errMsg(e), 'err'); }
  };
  if (!bills) return <Skeleton rows={5} />;
  const rows = bills.filter((b) => !filter || b.status === filter);
  return (
    <div className="space-y-3 fade-in">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Bills & Payments {readonly && <span className="text-sm font-normal">(read-only)</span>}</h1>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls + ' !w-auto'}><option value="">All</option><option>Pending</option><option>Overdue</option><option>Paid</option></select>
          <button onClick={() => toCSV(rows, 'bills.csv')} className={btnGhost}>CSV</button>
        </div>
      </div>
      {user?.role === 'ADMIN' && (
        <div className="glass rounded-2xl p-4 grid md:grid-cols-5 gap-2 items-end">
          <Field label="Fee type"><select value={gen.fee_type} onChange={(e) => setGen({ ...gen, fee_type: e.target.value })} className={inputCls}>{['hostel rent', 'mess fee', 'electricity', 'maintenance', 'fine'].map((f) => <option key={f}>{f}</option>)}</select></Field>
          <Field label="Amount ₹"><input type="number" value={gen.amount} onChange={(e) => setGen({ ...gen, amount: +e.target.value })} className={inputCls} /></Field>
          <Field label="Due date"><input type="date" value={gen.due_date} onChange={(e) => setGen({ ...gen, due_date: e.target.value })} className={inputCls} /></Field>
          <Field label="Month"><input value={gen.month} onChange={(e) => setGen({ ...gen, month: e.target.value })} className={inputCls} /></Field>
          <div className="flex gap-2">
            <button onClick={() => api.post('/bills/generate', gen).then(() => { toast('Bills generated'); load(); })} className={btnPrimary}>Generate</button>
            <button onClick={() => api.post('/bills/apply-fines', {}).then(() => { toast('Fines applied'); load(); })} className={btnGhost}>Fines</button>
            <button onClick={() => api.post('/bills/remind', {}).then(() => toast('Reminders sent'))} className={btnGhost}>Remind</button>
          </div>
        </div>
      )}
      {rev && <div className="glass rounded-2xl p-4"><b>Revenue by month</b><ResponsiveContainer width="100%" height={180}><BarChart data={rev.monthly}><XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="total" fill="#22c55e" radius={6} /></BarChart></ResponsiveContainer></div>}
      {!rows.length && <Empty />}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((b) => (
          <div key={b.id} className="glass rounded-2xl p-4 card-hover">
            <div className="flex justify-between items-start"><div><b>#{b.id} {b.fee_type}</b><div className="text-xs opacity-70">{b.name} · {b.roll_no} · {b.month} · due {b.due_date}</div></div><Badge tone={toneFor(b.status)}>{b.status}</Badge></div>
            <div className="mt-2 font-heading font-bold text-xl">₹{(b.amount + (b.fine || 0)).toLocaleString()} {b.fine ? <span className="text-xs text-red-500">(incl fine ₹{b.fine})</span> : null}</div>
            {!readonly && b.status !== 'Paid' && (user?.role !== 'WARDEN') && <button onClick={() => setPayOpen(b)} className={btnPrimary + ' mt-2 w-full'}>Pay now</button>}
          </div>
        ))}
      </div>
      <Modal open={!!payOpen} onClose={() => setPayOpen(null)} title={`Mock payment — Bill #${payOpen?.id}`}>
        <p className="text-sm mb-2">Amount: <b>₹{payOpen && (payOpen.amount + (payOpen.fine || 0))}</b> (demo gateway, generates transaction ID + PDF receipt)</p>
        <div className="flex gap-2 mb-3">{['UPI', 'Card', 'Net Banking'].map((m) => <button key={m} onClick={() => setMethod(m)} className={`px-3 py-2 rounded-xl text-sm border ${method === m ? 'bg-amber-500 text-white' : ''}`}>{m}</button>)}</div>
        {method === 'UPI' && <input placeholder="you@upi" className={inputCls + ' mb-2'} />}
        {method === 'Card' && <div className="grid grid-cols-2 gap-2 mb-2"><input placeholder="Card number" className={inputCls} /><input placeholder="CVV" className={inputCls} /></div>}
        <button onClick={pay} className={btnPrimary + ' w-full'}>Pay ₹{payOpen && (payOpen.amount + (payOpen.fine || 0))} via {method}</button>
      </Modal>
    </div>
  );
}
