import React, { useState, useEffect, useCallback } from 'react';

// ─── IST time check ────────────────────────────────────
function isOpen(openIST, closeIST) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const [oh, om] = openIST.split(':').map(Number);
  const [ch, cm] = closeIST.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

const HELPLINES = [
  { name: 'iCall', org: 'TISS Mumbai', phone: '9152987821', wa: '918686139139', openTime: '08:00', closeTime: '22:00', openDays: 'Mon–Sat', languages: ['Hindi', 'English'], color: '#7C3AED', icon: '📞' },
  { name: 'Vandrevala Foundation', org: '24/7 Crisis Line', phone: '18602662345', wa: null, openTime: '00:00', closeTime: '24:00', openDays: '24/7', languages: ['Hindi', 'English'], color: '#059669', icon: '💚' },
  { name: 'Snehi', org: 'Chennai', phone: '04424640050', wa: null, openTime: '08:00', closeTime: '22:00', openDays: 'Mon–Fri', languages: ['Tamil', 'English'], color: '#D97706', icon: '🌸' },
  { name: 'NIMHANS', org: 'Bengaluru', phone: '08046110007', wa: null, openTime: '09:00', closeTime: '17:00', openDays: 'Mon–Sat', languages: ['Kannada', 'Hindi', 'English'], color: '#2563EB', icon: '🏥' },
];

// ─── Breathing Circle ──────────────────────────────────
const PRESETS = [
  { id: '478', name: '4-7-8', label: 'Anxiety Relief', inhale: 4, hold: 7, exhale: 8 },
  { id: 'box', name: 'Box', label: 'Focus', inhale: 4, hold: 4, exhale: 4, holdOut: 4 },
  { id: '24', name: '2-4', label: 'Sleep', inhale: 2, hold: 0, exhale: 4 },
];

function BreathingCircle() {
  const [active, setActive] = useState(false);
  const [preset, setPreset] = useState(PRESETS[0]);
  const [phase, setPhase] = useState('ready');
  const [countdown, setCountdown] = useState(0);
  const [cycle, setCycle] = useState(0);
  const MAX_CYCLES = 4;

  const PHASES = useCallback(() => {
    const p = [];
    p.push({ name: 'Breathe In', duration: preset.inhale, color: '#7C3AED', scale: 1.5 });
    if (preset.hold > 0) p.push({ name: 'Hold', duration: preset.hold, color: '#06B6D4', scale: 1.5 });
    p.push({ name: 'Breathe Out', duration: preset.exhale, color: '#4C1D95', scale: 1 });
    if (preset.holdOut) p.push({ name: 'Hold', duration: preset.holdOut, color: '#06B6D4', scale: 1 });
    return p;
  }, [preset]);

  useEffect(() => {
    if (!active) return;
    const phases = PHASES();
    let pi = 0, secs = phases[0].duration;
    setPhase(phases[0].name);
    setCountdown(secs);

    const interval = setInterval(() => {
      secs--;
      if (secs <= 0) {
        pi = (pi + 1) % phases.length;
        if (pi === 0) {
          setCycle((c) => {
            if (c + 1 >= MAX_CYCLES) { setActive(false); setPhase('done'); clearInterval(interval); return c; }
            return c + 1;
          });
        }
        secs = phases[pi].duration;
        setPhase(phases[pi].name);
      }
      setCountdown(secs);
    }, 1000);
    return () => clearInterval(interval);
  }, [active, PHASES]);

  const currentPresetPhases = PHASES();
  const phaseObj = currentPresetPhases.find((p) => p.name === phase) || currentPresetPhases[0];
  const circleScale = active ? (phaseObj?.scale || 1) : 1;
  const circleBg = active ? (phaseObj?.color || '#7C3AED') : '#7C3AED';

  return (
    <div className="glass-card" style={{ padding: 24, marginBottom: 16, textAlign: 'center' }}>
      <p className="section-title">Breathing Exercise</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => { setPreset(p); setActive(false); setPhase('ready'); setCycle(0); }} style={{
            padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: preset.id === p.id ? 'var(--brand)' : 'rgba(255,255,255,0.08)',
            color: preset.id === p.id ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}>{p.name} · {p.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div className="breath-circle" style={{
          transform: `scale(${circleScale})`,
          background: `radial-gradient(circle at center, ${circleBg}, ${circleBg}cc)`,
          transition: `transform ${phase === 'Breathe In' ? preset.inhale : phase === 'Breathe Out' ? preset.exhale : 0.5}s ease-in-out, background 0.8s ease`,
          marginBottom: 32,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{active ? phase : phase === 'done' ? '🌿 Done!' : 'Tap Start'}</span>
          {active && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 32, marginTop: 4 }}>{countdown}</span>}
        </div>
        {active && <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>Cycle {cycle + 1} of {MAX_CYCLES}</p>}
        {phase === 'done' && <p style={{ color: 'var(--success)', fontSize: 15, marginTop: 40, fontWeight: 600 }}>Well done. How do you feel now? 🌿</p>}
      </div>

      <button className="btn-primary" onClick={() => { setActive(!active); if (!active) { setPhase('ready'); setCycle(0); } }} style={{ minWidth: 140 }}>
        {active ? '⏹ Stop' : '▶ Start'}
      </button>
    </div>
  );
}

// ─── Helpline Card ─────────────────────────────────────
function HelplineCard({ hl }) {
  const open = isOpen(hl.openTime, hl.closeTime) && hl.openTime !== '00:00';
  const always = hl.openTime === '00:00';
  return (
    <div className="helpline-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${hl.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{hl.icon}</div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{hl.name}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hl.org}</p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          {always ? (
            <span style={{ fontSize: 12 }}><span className="open-dot"/>Open 24/7</span>
          ) : open ? (
            <span style={{ fontSize: 12, color: 'var(--success)' }}><span className="open-dot"/>Open now</span>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><span className="closed-dot"/>Closed now</span>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{hl.openDays}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href={`tel:${hl.phone}`} style={{
          flex: 1, textAlign: 'center', padding: '10px', borderRadius: 100, border: `1px solid ${hl.color}66`,
          color: hl.color, fontWeight: 700, fontSize: 14, textDecoration: 'none', background: `${hl.color}11`,
        }}>📞 Call Now</a>
        {hl.wa && (
          <a href={`https://wa.me/${hl.wa}`} target="_blank" rel="noreferrer" style={{
            flex: 1, textAlign: 'center', padding: '10px', borderRadius: 100, border: '1px solid #075E5466',
            color: '#25D366', fontWeight: 700, fontSize: 14, textDecoration: 'none', background: '#075E5411',
          }}>💬 WhatsApp</a>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {hl.languages.map((l) => <span key={l} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 100 }}>{l}</span>)}
      </div>
    </div>
  );
}

// ─── Crisis FAQ ────────────────────────────────────────
const FAQ = [
  { q: 'Is this app confidential?', a: 'AnonThera uses anonymous IDs — your real name, phone, or email is never stored or shared. Your AI conversations are yours alone.' },
  { q: 'What if I feel like hurting myself?', a: 'Please reach out to iCall (9152987821) right away. They have counselors who really understand students. You don\'t have to go through this alone.' },
  { q: 'Can the AI replace a therapist?', a: 'No, and it doesn\'t try to. AnonThera is a supportive companion — not a clinical tool. If you need professional support, the helplines above are real people who care.' },
  { q: 'What if my peer says something upsetting?', a: 'Tap the 🚩 flag icon to report the chat instantly. Both users\' safety is our priority — the chat will be paused immediately.' },
];

function CrisisFAQ() {
  const [open, setOpen] = useState(null);
  return (
    <div className="glass-card" style={{ padding: '8px 20px', marginBottom: 16 }}>
      <p className="section-title" style={{ marginTop: 12 }}>Common Questions</p>
      {FAQ.map((f, i) => (
        <div key={i} className="accordion-item">
          <div className="accordion-header" onClick={() => setOpen(open === i ? null : i)}>
            <span>{f.q}</span>
            <span style={{ color: 'var(--brand-light)', fontSize: 18, transition: 'transform 0.2s', transform: open === i ? 'rotate(45deg)' : 'none' }}>+</span>
          </div>
          <div className="accordion-body" style={{ maxHeight: open === i ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
            {f.a}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Safety Plan Builder ───────────────────────────────
function SafetyPlanBuilder() {
  const stored = JSON.parse(localStorage.getItem('anonthera_safety') || '{}');
  const [plan, setPlan] = useState({ calm: stored.calm || '', people: stored.people || '', place: stored.place || '', helpline: stored.helpline || 'iCall', reason: stored.reason || '' });
  const [saved, setSaved] = useState(false);

  const update = (k, v) => setPlan((p) => ({ ...p, [k]: v }));
  const save = () => {
    localStorage.setItem('anonthera_safety', JSON.stringify(plan));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
      <p className="section-title">My Safety Plan 🛡️</p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>A plan you build for yourself. Saved on this device.</p>
      {[
        { key: 'calm', label: '1. Three things that calm me down:', placeholder: 'Music, walking, calling my dog...' },
        { key: 'people', label: '2. Two people I can call right now:', placeholder: 'Name & number, or just their name...' },
        { key: 'place', label: '3. One place I feel safe:', placeholder: 'My room, the library, near the tree outside...' },
        { key: 'reason', label: '5. My reason to hold on today:', placeholder: 'Even one small thing...' },
      ].map((s) => (
        <div key={s.key} className="safety-step" style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.label}</p>
          <textarea rows={2} placeholder={s.placeholder} value={plan[s.key]} onChange={(e) => update(s.key, e.target.value)} />
        </div>
      ))}
      <div className="safety-step" style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>4. The helpline I will call:</p>
        <select value={plan.helpline} onChange={(e) => update('helpline', e.target.value)} style={{ marginTop: 8, width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
          {HELPLINES.map((h) => <option key={h.name} value={h.name}>{h.name} — {h.phone}</option>)}
        </select>
      </div>
      <button className="btn-primary" onClick={save} style={{ width: '100%', marginTop: 8 }}>
        {saved ? '✅ Saved!' : 'Save My Plan'}
      </button>
    </div>
  );
}

// ─── Main Help Tab ─────────────────────────────────────
export default function HelpTab({ showSOSBanner }) {
  return (
    <div className="page" style={{ padding: '16px 16px 0' }}>
      {showSOSBanner && (
        <div style={{ padding: '16px', background: 'linear-gradient(135deg, #7F1D1D, #991B1B)', borderRadius: 16, marginBottom: 16, border: '1px solid rgba(239,68,68,0.3)', animation: 'slide-up 0.6s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 36, animation: 'float 2s ease-in-out infinite' }}>💙</span>
            <div>
              <p style={{ fontWeight: 700, color: '#FCA5A5', fontSize: 16 }}>You don't have to face this alone.</p>
              <p style={{ color: 'rgba(252,165,165,0.7)', fontSize: 13 }}>Reach out to a real person right now.</p>
            </div>
          </div>
        </div>
      )}
      <BreathingCircle />
      <div style={{ marginBottom: 16 }}>
        <p className="section-title">Crisis Helplines</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {HELPLINES.map((hl) => <HelplineCard key={hl.name} hl={hl} />)}
        </div>
      </div>
      <CrisisFAQ />
      <SafetyPlanBuilder />
    </div>
  );
}
