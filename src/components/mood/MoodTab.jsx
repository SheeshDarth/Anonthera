import React, { useState } from 'react';
import { useMoodData } from '../../hooks/useMoodData';
import { useAI } from '../../hooks/useAI';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const EMOJIS = ['😴', '😔', '😐', '🙂', '⚡'];
const CONFETTI_COLORS = ['#7C3AED', '#A855F7', '#10B981', '#06B6D4', '#F59E0B', '#EF4444', '#EC4899'];

function spawnConfetti() {
  for (let i = 0; i < 16; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top = '-10px';
    el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
    el.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const e = payload[0]?.value;
  return (
    <div style={{ background: 'rgba(22,13,46,0.95)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: '10px 14px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22 }}>{e ? EMOJIS[e - 1] : '—'}</p>
    </div>
  );
};

export default function MoodTab({ user, language, onBridgeToChat }) {
  const { entries, todayEntry, streak, saveEntry, last7 } = useMoodData(user);
  const { generateWeeklyInsight, isLoading: aiLoading } = useAI(language, user);

  function getMonday() {
    const d = new Date();
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  }

  const [energy, setEnergy] = useState(null);
  const [worry, setWorry] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [insight, setInsight] = useState(() => {
    const cached = localStorage.getItem('anonthera_insight');
    if (cached) {
      const { text, date } = JSON.parse(cached);
      const monday = getMonday();
      if (date === monday) return text;
    }
    return null;
  });


  const chartData = last7();
  const gratitudeLog = entries.filter((e) => e.gratitude).slice(0, 30);

  const handleSubmit = async () => {
    if (energy === null) return;
    await saveEntry({ energy, worry, gratitude });
    setSubmitted(true);
    spawnConfetti();
    // Generate weekly insight on Monday or first submit
    if (!insight) {
      const data = last7().map((d) => ({ date: d.date, energy: d.energy }));
      const text = await generateWeeklyInsight(data, language.promptName);
      setInsight(text);
      localStorage.setItem('anonthera_insight', JSON.stringify({ text, date: getMonday() }));
    }
  };

  return (
    <div className="page" style={{ padding: '16px 16px 0' }}>
      {/* Streak */}
      {streak > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <div className="streak-badge">
            <span className="streak-flame">{streak >= 3 ? '🔥' : '✨'}</span> {streak}-day streak
          </div>
        </div>
      )}

      {/* Daily Check-In */}
      {!todayEntry && !submitted ? (
        <div className="glass-card" style={{ padding: 20, marginBottom: 16, background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.06) 100%)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <p className="section-title">Today's Check-in</p>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>How's your energy right now?</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            {EMOJIS.map((e, i) => (
              <button key={i} className={`mood-emoji-btn ${energy === i + 1 ? 'selected' : ''}`} onClick={() => setEnergy(i + 1)}>
                {e}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>Anything weighing on you? <span style={{ color: 'var(--text-muted)' }}>(optional)</span></p>
            <textarea
              value={worry}
              onChange={(e) => setWorry(e.target.value)}
              placeholder="Exams, a friend, something at home..."
              maxLength={500}
              rows={2}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14,
                outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif',
              }}
            />
            {worry.length > 0 && (
              <button
                onClick={() => onBridgeToChat(worry)}
                style={{
                  marginTop: 8, background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--brand-light)', fontSize: 13, fontWeight: 600,
                }}
              >
                Talk through this with AnonThera →
              </button>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>One tiny thing you're grateful for? Even small counts 🙏</p>
            <input
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder="Today's chai, a song, a message from someone..."
              maxLength={200}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14,
                outline: 'none', fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>
          <button className="btn-primary" onClick={handleSubmit} disabled={energy === null} style={{ width: '100%' }}>
            Save my check-in ✓
          </button>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 20, marginBottom: 16, textAlign: 'center', border: '1px solid rgba(16,185,129,0.3)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>Check-in saved!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>See you tomorrow 🌱</p>
        </div>
      )}

      {/* 7-Day Mood Graph */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
        <p className="section-title">7-Day Mood</p>
        {chartData.some((d) => d.energy !== null) ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 5]} hide />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="energy" stroke="#7C3AED" strokeWidth={3} fill="url(#moodGrad)" dot={{ fill: '#7C3AED', r: 5, strokeWidth: 2, stroke: '#A855F7' }} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📊</p>
            <p style={{ fontSize: 14 }}>Start your streak to see your mood graph →</p>
          </div>
        )}
      </div>

      {/* Weekly AI Insight */}
      {insight && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 16, background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(168,85,247,0.05) 100%)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <p className="section-title">✨ Weekly Insight</p>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{insight}</p>
        </div>
      )}
      {aiLoading && !insight && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="shimmer" style={{ height: 60, borderRadius: 12 }} />
        </div>
      )}

      {/* Gratitude Log */}
      {gratitudeLog.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p className="section-title">Gratitude Log 🙏</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gratitudeLog.map((e) => (
              <div key={e.date} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: 2 }}>{e.date}</span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{e.gratitude}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
