import { useState } from 'react';
export function Badge({ tone = 'gray', children }) {
  const tones = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
export const toneFor = (s) => {
  if (['Paid', 'Resolved', 'Approved', 'Returned', 'present', 'Fixed'].includes(s)) return 'green';
  if (['Overdue', 'Rejected', 'absent'].includes(s)) return 'red';
  if (['Pending', 'In Progress', 'on-leave', 'WardenApproved', 'Assigned'].includes(s)) return 'yellow';
  if (['on-outpass', 'CheckedOut'].includes(s)) return 'blue';
  return 'gray';
};
export function Stat({ icon, label, value, sub }) {
  return (
    <div className="glass rounded-2xl p-4 card-hover fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-400/20 text-amber-500">{icon}</div>
        <div><div className="text-xs opacity-70 font-medium">{label}</div><div className="text-2xl font-heading font-bold">{value}</div></div>
      </div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );
}
export function Empty({ text = 'No records found' }) {
  return <div className="glass rounded-2xl p-8 text-center opacity-80">{text}</div>;
}
export function Skeleton({ rows = 3 }) {
  return <div className="space-y-2">{Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton glass rounded-xl h-12" />)}</div>;
}
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="glass rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-auto fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-heading font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="px-2 py-1 rounded-lg hover:bg-black/10">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Confirm({ open, onClose, onYes, text }) {
  return <Modal open={open} onClose={onClose} title="Please confirm"><p className="mb-4">{text}</p>
    <div className="flex gap-2 justify-end"><button onClick={onClose} className="px-4 py-2 rounded-xl border">Cancel</button>
    <button onClick={onYes} className="px-4 py-2 rounded-xl bg-red-600 text-white">Confirm</button></div></Modal>;
}
let toastFn = null;
export function Toaster({ register }) {
  const [items, setItems] = useState([]);
  toastFn = (msg, type = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, msg, type }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3000);
  };
  register(toastFn);
  return <div className="fixed bottom-4 right-4 z-[60] space-y-2">{items.map((t) => (
    <div key={t.id} className={`glass rounded-xl px-4 py-2 text-sm font-medium border-l-4 ${t.type === 'err' ? 'border-l-red-500' : 'border-l-green-500'}`}>{t.msg}</div>))}</div>;
}
export const toast = (m, t) => toastFn && toastFn(m, t);
export function Field({ label, children }) {
  return <label className="block mb-2"><span className="text-xs font-semibold opacity-70">{label}</span><div className="mt-1">{children}</div></label>;
}
export const inputCls = 'w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 text-sm outline-none focus:ring-2 ring-amber-400';
export const btnPrimary = 'px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition';
export const btnGhost = 'px-4 py-2 rounded-xl border border-black/10 dark:border-white/15 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition';
export function toCSV(rows, filename) {
  if (!rows?.length) return toast('Nothing to export', 'err');
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename; a.click();
}
