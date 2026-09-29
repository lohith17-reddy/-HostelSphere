import { useState } from 'react';
// Rule-based FAQ chatbot (no external API)
const RULES = [
  { k: ['fee', 'due', 'bill', 'payment', 'fine'], a: 'Fees are due by the 10th of each month. Types: hostel rent ₹8000, mess ₹4500, electricity ₹800, maintenance ₹500. Late fine ₹100. Pay via UPI/Card/NetBanking on the Bills page; a PDF receipt is generated.' },
  { k: ['outpass', 'gate', 'leave campus', 'permission'], a: 'Apply on the Outpass page with reason, destination, out/return time. Warden or Admin approves. Approved passes show a QR code for the gate. Emergency outpasses are highlighted.' },
  { k: ['mess', 'food', 'menu', 'timing', 'wastage'], a: 'Mess timings: Breakfast 7–9am, Lunch 12–2pm, Snacks 4:30–6pm, Dinner 7–9pm. Weekly menu is on the Mess page. You can rate meals and mark "skipping" in advance — it improves our wastage predictor.' },
  { k: ['attendance', 'absent', 'night'], a: 'Night attendance is marked daily by your warden. Approved outpasses auto-mark you "on-outpass". 3+ consecutive absences alert your warden.' },
  { k: ['complaint', 'complain', 'issue', 'repair'], a: 'Raise tickets on the Complaints page (Food/Room/WiFi/etc.). Track Open → In Progress → Resolved, reply in threads, and rate the resolution.' },
  { k: ['laundry'], a: 'Book a weekly laundry slot on the Laundry page. Each slot has limited capacity.' },
  { k: ['visitor'], a: 'Visitors are logged by your warden with in/out time. Ask your visitor to carry an ID.' },
  { k: ['room change', 'shift room'], a: 'Request a room change on the Room Requests page. Needs warden + admin approval.' },
  { k: ['leave', 'long leave', 'vacation'], a: 'For multi-day absence use the Leave page (separate from short outpass).' },
  { k: ['sos', 'emergency', 'help'], a: 'Use the red SOS button (students) — it instantly alerts your block warden + admin with your room details.' },
  { k: ['password', 'login'], a: 'Use your demo email + password on the login page. Change password from the Profile menu.' },
];
export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: 'bot', text: 'Hi! I\'m HostelBuddy. Ask about fees, outpass, mess, attendance, complaints…' }]);
  const [q, setQ] = useState('');
  const ask = (text) => {
    const query = (text ?? q).toLowerCase();
    if (!query.trim()) return;
    const hit = RULES.find((r) => r.k.some((k) => query.includes(k)));
    setMsgs((m) => [...m, { from: 'me', text: q || text }, { from: 'bot', text: hit ? hit.a : 'I can help with: fee due dates, outpass rules, mess timings, attendance, complaints, laundry, visitors, room change, leave, SOS. Try one!' }]);
    setQ('');
  };
  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open && (
        <div className="glass rounded-2xl w-80 max-w-[90vw] p-3 mb-2 fade-in">
          <div className="font-heading font-bold mb-2">HostelBuddy 🤖</div>
          <div className="h-64 overflow-auto space-y-2 text-sm mb-2">
            {msgs.map((m, i) => <div key={i} className={`p-2 rounded-xl ${m.from === 'bot' ? 'bg-amber-100/70 dark:bg-white/10' : 'bg-blue-500 text-white ml-6'}`}>{m.text}</div>)}
          </div>
          <div className="flex gap-1">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Ask something…" className="flex-1 px-2 py-1.5 rounded-lg border text-sm bg-white/70 dark:bg-black/30" />
            <button onClick={() => ask()} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm">➤</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="w-12 h-12 rounded-full bg-amber-500 text-white text-xl shadow-lg hover:scale-105 transition">💬</button>
    </div>
  );
}
