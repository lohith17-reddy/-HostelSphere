import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api, { errMsg } from '../api.js';
import { Badge, Skeleton, Field, inputCls, btnPrimary, btnGhost, toast } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];
const riskColor = { green: 'bg-green-100 text-green-800', yellow: 'bg-yellow-100 text-yellow-800', red: 'bg-red-100 text-red-800' };
const TIPS = ['Share daily predicted eaters with the cook before 6am.', 'Cook 5% buffer only — predictor already includes it.', 'High-waste meals: reduce batch size, offer seconds instead.', 'Weekends/holidays: expect 10–25% fewer eaters.', 'Encourage "skipping" marks — every signal saves ~0.35kg.'];

export default function Mess() {
  const { user } = useAuth();
  const canEdit = user?.role !== 'STUDENT';
  const [d, setD] = useState(null);
  const [menu, setMenu] = useState([]);
  const [rec, setRec] = useState({ date: new Date().toISOString().slice(0, 10), meal: 'lunch', prepared_kg: 20, consumed_kg: 17, eaters: 50 });
  const [fb, setFb] = useState({ date: new Date().toISOString().slice(0, 10), meal: 'lunch', rating: 4, skipping: false });
  const load = () => Promise.all([api.get('/mess/dashboard'), api.get('/mess/menu')]).then(([a, b]) => { setD(a.data.data); setMenu(b.data.data); });
  useEffect(() => { load(); }, []);
  if (!d) return <Skeleton rows={5} />;
  return (
    <div className="space-y-3 fade-in">
      <h1 className="font-heading text-2xl font-bold">Mess & Food Wastage Predictor</h1>
      {/* predictions */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {d.predictions.map((p) => (
          <div key={p.meal} className="glass rounded-2xl p-4 card-hover">
            <div className="flex justify-between items-center"><b className="capitalize">{p.meal}</b><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${riskColor[p.risk]}`}>{p.risk.toUpperCase()}</span></div>
            <div className="text-3xl font-heading font-bold mt-1">{p.predictedEaters} <span className="text-sm font-normal">eaters</span></div>
            <div className="text-sm">Cook <b>{p.recommendedKg} kg</b> <span className="opacity-60">({p.perPersonKg} kg/person)</span></div>
            <div className="text-[11px] opacity-70 mt-1">base {p.factors.baseEaters} · out {p.factors.outCount} · leave {p.factors.leaveCount} · skip {p.factors.skipping} · waste {(p.factors.wasteRatio * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
      <div className="text-xs opacity-70">Forecast for <b>{d.date}</b> · 14-day moving average + day-of-week + holidays + outpass/leave + attendance + menu popularity + skip signals.</div>
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4"><b>Wastage trend (kg/day)</b>
          <ResponsiveContainer width="100%" height={200}><LineChart data={d.trend}><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={11} /><Tooltip /><Line dataKey="waste" stroke="#ef4444" strokeWidth={2} /></LineChart></ResponsiveContainer>
          <div className="text-sm mt-1">Total waste: <b>{Math.round(d.totalWaste.t || 0)} kg</b> · Cost: <b>₹{Math.round(d.totalWaste.c || 0).toLocaleString()}</b></div></div>
        <div className="glass rounded-2xl p-4"><b>Avg waste by meal</b>
          <ResponsiveContainer width="100%" height={200}><BarChart data={d.byMeal}><XAxis dataKey="meal" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="avgWaste" fill="#f5b942" radius={6} /></BarChart></ResponsiveContainer>
          <div className="text-sm">Ratings: {d.ratings.map((r) => <span key={r.meal} className="mr-2">{r.meal} ⭐{Number(r.avg).toFixed(1)}</span>)}</div></div>
      </div>
      {/* menu */}
      <div className="glass rounded-2xl p-4"><b>Weekly menu</b>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 text-sm">
          {MEALS.map((meal) => <div key={meal}><b className="capitalize">{meal}</b>{menu.filter((m) => m.meal === meal).map((m) => <div key={m.id} className="opacity-80">{m.day}: {m.items}</div>)}</div>)}
        </div></div>
      <div className="grid lg:grid-cols-3 gap-3">
        {canEdit && (
          <div className="glass rounded-2xl p-4">
            <b>Record prepared vs consumed</b>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Field label="Date"><input type="date" value={rec.date} onChange={(e) => setRec({ ...rec, date: e.target.value })} className={inputCls} /></Field>
              <Field label="Meal"><select value={rec.meal} onChange={(e) => setRec({ ...rec, meal: e.target.value })} className={inputCls}>{MEALS.map((m) => <option key={m}>{m}</option>)}</select></Field>
              <Field label="Prepared kg"><input type="number" step="0.1" value={rec.prepared_kg} onChange={(e) => setRec({ ...rec, prepared_kg: +e.target.value })} className={inputCls} /></Field>
              <Field label="Consumed kg"><input type="number" step="0.1" value={rec.consumed_kg} onChange={(e) => setRec({ ...rec, consumed_kg: +e.target.value })} className={inputCls} /></Field>
              <Field label="Eaters"><input type="number" value={rec.eaters} onChange={(e) => setRec({ ...rec, eaters: +e.target.value })} className={inputCls} /></Field>
            </div>
            <button onClick={() => api.post('/mess/records', rec).then(() => { toast('Record saved'); load(); }).catch((e) => toast(errMsg(e), 'err'))} className={btnPrimary + ' mt-2 w-full'}>Save</button>
          </div>
        )}
        {!canEdit && (
          <div className="glass rounded-2xl p-4">
            <b>Rate / skip a meal</b>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Field label="Date"><input type="date" value={fb.date} onChange={(e) => setFb({ ...fb, date: e.target.value })} className={inputCls} /></Field>
              <Field label="Meal"><select value={fb.meal} onChange={(e) => setFb({ ...fb, meal: e.target.value })} className={inputCls}>{MEALS.map((m) => <option key={m}>{m}</option>)}</select></Field>
              <Field label="Rating 1–5"><input type="number" min="1" max="5" value={fb.rating} onChange={(e) => setFb({ ...fb, rating: +e.target.value })} className={inputCls} /></Field>
              <label className="text-sm flex items-center gap-2 mt-6"><input type="checkbox" checked={fb.skipping} onChange={(e) => setFb({ ...fb, skipping: e.target.checked })} /> Skipping</label>
            </div>
            <button onClick={() => api.post('/mess/feedback', fb).then(() => toast('Thanks! Predictor updated')).catch((e) => toast(errMsg(e), 'err'))} className={btnPrimary + ' mt-2 w-full'}>Submit</button>
          </div>
        )}
        <div className="glass rounded-2xl p-4 lg:col-span-2"><b>💡 Waste reduction tips</b><ul className="list-disc ml-5 mt-2 text-sm space-y-1">{TIPS.map((t) => <li key={t}>{t}</li>)}</ul></div>
      </div>
    </div>
  );
}
