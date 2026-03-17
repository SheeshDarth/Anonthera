import React, { useState, useEffect } from 'react';

// ─── Screen 1: Welcome ───────────────────────────────
function WelcomeScreen({ onNext, onSkip }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: '40px 24px', textAlign: 'center',
    }}>
      {/* Floating emoji */}
      <img
        src="/logo.png" alt="AnonThera" 
        style={{
          width: 72, height: 72, borderRadius: 16,
          animation: 'float 4s ease-in-out infinite',
          opacity: visible ? 1 : 0, transition: 'opacity 0.6s',
          filter: 'drop-shadow(0 4px 16px rgba(155,114,207,0.3))',
        }}
      />

      <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s 0.3s', marginTop: 32 }}>
        <h1 style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 52, fontWeight: 800,
          letterSpacing: '-2px', background: 'linear-gradient(135deg, #B09EDE, #EDE8E3)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1,
        }}>AnonThera</h1>
        <p style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontStyle: 'italic',
          fontSize: 18, color: 'var(--brand-soft)', marginTop: 14, lineHeight: 1.6,
        }}>A safe space. No names.<br />No judgment.</p>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>
          Five languages. Always free. 🇮🇳
        </p>
      </div>

      <div style={{
        opacity: visible ? 1 : 0, transition: 'opacity 0.6s 0.6s',
        marginTop: 48, display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320,
      }}>
        <button className="btn-primary" onClick={onNext} style={{ fontSize: 18, padding: '16px 32px' }}>
          Get Started →
        </button>
        <button className="btn-ghost" onClick={onSkip}>Skip</button>
      </div>

      {/* Floating orbs */}
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(155,114,207,0.1) 0%, transparent 70%)',
        top: '10%', left: '-10%', animation: 'orb-drift-a 10s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 250, height: 250, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(123,174,154,0.07) 0%, transparent 70%)',
        bottom: '15%', right: '-8%', animation: 'orb-drift-b 13s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ─── Screen 2: Language Select ───────────────────────
const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', native: 'English', promptName: 'English', speech: 'en-IN' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳', native: 'हिंदी', promptName: 'Hindi', speech: 'hi-IN' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳', native: 'தமிழ்', promptName: 'Tamil', speech: 'ta-IN' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳', native: 'తెలుగు', promptName: 'Telugu', speech: 'te-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳', native: 'ಕನ್ನಡ', promptName: 'Kannada', speech: 'kn-IN' },
];

const GREETINGS = { en: 'Hello! 👋', hi: 'नमस्ते! 🙏', ta: 'வணக்கம்! 🙏', te: 'నమస్కారం! 🙏', kn: 'ನಮಸ್ಕಾರ! 🙏' };

function LanguageScreen({ onNext, onLanguageSelect }) {
  const [selected, setSelected] = useState('en');
  const select = (code) => {
    setSelected(code);
    onLanguageSelect(LANGUAGES.find((l) => l.code === code));
    // Play greeting via TTS
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(GREETINGS[code]);
      u.lang = LANGUAGES.find((l) => l.code === code)?.speech || 'en-IN';
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 28, fontWeight: 800, lineHeight: 1.2, color: 'var(--text-primary)' }}>
          Which language feels like home? 🏡
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 15 }}>You can change this anytime.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
        {LANGUAGES.map((l, i) => (
          <button
            key={l.code}
            onClick={() => select(l.code)}
            style={{
              gridColumn: i === 4 ? '1 / -1' : undefined,
              padding: '20px 16px', borderRadius: 20, cursor: 'pointer',
              border: selected === l.code ? '2px solid var(--brand)' : '1px solid rgba(255,245,235,0.1)',
              background: selected === l.code ? 'var(--brand-dim)' : 'rgba(255,245,235,0.04)',
              transition: 'all 0.2s var(--ease-spring)',
              transform: selected === l.code ? 'scale(1.03)' : 'scale(1)',
              boxShadow: selected === l.code ? '0 0 18px var(--brand-glow)' : 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>{l.flag}</span>
            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{l.native}</span>
            {selected === l.code && <span style={{ fontSize: 12, color: 'var(--brand-soft)' }}>✓ Selected</span>}
          </button>
        ))}
      </div>
      <button className="btn-primary" onClick={onNext} style={{ marginTop: 24 }}>
        Continue →
      </button>
    </div>
  );
}

// ─── Screen 3: Struggle Tags ─────────────────────────
const STRUGGLE_TAGS = [
  { emoji: '😓', label: 'Academic pressure' },
  { emoji: '📝', label: 'Exam anxiety' },
  { emoji: '😶', label: 'Loneliness' },
  { emoji: '👨‍👩‍👧', label: 'Family issues' },
  { emoji: '💔', label: 'Friendship problems' },
  { emoji: '🎯', label: 'Career confusion' },
  { emoji: '💭', label: 'Just need to vent' },
  { emoji: '😴', label: 'Sleep & exhaustion' },
  { emoji: '💸', label: 'Financial stress' },
  { emoji: '🌪️', label: 'General anxiety' },
  { emoji: '🏠', label: 'Homesickness' },
];

function StruggleScreen({ onNext, onStrugglesSelect }) {
  const [selected, setSelected] = useState([]);
  const toggle = (label) => {
    setSelected((prev) => prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]);
  };
  const handleNext = () => { onStrugglesSelect(selected); onNext(); };

  return (
    <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>
          What brings you here today?
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
          Choose as many as feel true. This helps us connect you with the right people.
        </p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start' }}>
        {STRUGGLE_TAGS.map((tag) => (
          <button
            key={tag.label}
            className={`tag-pill ${selected.includes(tag.label) ? 'selected' : ''}`}
            onClick={() => toggle(tag.label)}
          >
            <span>{tag.emoji}</span> {tag.label}
            {selected.includes(tag.label) && <span>✓</span>}
          </button>
        ))}
      </div>
      <button
        className="btn-primary"
        onClick={handleNext}
        disabled={selected.length === 0}
        style={{ marginTop: 24 }}
      >
        Continue → {selected.length > 0 && `(${selected.length} selected)`}
      </button>
    </div>
  );
}

// ─── Screen 4: Anon Reveal ────────────────────────────
const ADJECTIVES = ['Calm','Gentle','Quiet','Brave','Warm','Kind','Soft','Still','Bold','Clear','Bright','Deep','Free','True','Pure','Swift'];
const ANIMALS = ['Panda','Elephant','Deer','Owl','Fox','Rabbit','Turtle','Sparrow','Dolphin','Tiger','Crane','Otter','Eagle','Lynx','Wolf','Bear'];

function AnonRevealScreen({ onComplete, anonId }) {
  const [step, setStep] = useState(0);
  const [displayedId, setDisplayedId] = useState('');

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => {
        setStep(2);
        // Letter-by-letter reveal
        let i = 0;
        const interval = setInterval(() => {
          setDisplayedId(anonId.slice(0, i + 1));
          i++;
          if (i >= anonId.length) clearInterval(interval);
        }, 60);
      }, 1500),
      setTimeout(() => setStep(3), 2700),
      setTimeout(() => setStep(4), 3500),
      setTimeout(() => setStep(5), 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [anonId]);

  return (
    <div style={{
      padding: '40px 24px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center',
    }}>
      {step >= 1 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, animation: 'fade-in 0.5s ease', letterSpacing: '0.05em' }}>
          ✦ Generating your identity...
        </p>
      )}
      {step >= 2 && (
        <div style={{ margin: '32px 0', animation: 'fade-in 0.5s ease' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>Your anonymous identity</p>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 700,
            color: 'var(--brand-soft)', letterSpacing: '0.05em',
            filter: 'drop-shadow(0 0 18px rgba(155,114,207,0.5))',
          }}>
            {displayedId}<span style={{ opacity: displayedId.length < anonId.length ? 1 : 0 }}>_</span>
          </div>
        </div>
      )}
      {step >= 3 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 280, lineHeight: 1.6, animation: 'fade-in 0.5s ease' }}>
          This is you on AnonThera. <strong style={{ color: 'var(--text-primary)' }}>No real name. Ever.</strong>
        </p>
      )}
      {step >= 4 && (
        <div className="glass-card" style={{ margin: '24px 0', padding: '24px', width: '100%', maxWidth: 320, animation: 'slide-up 0.5s ease' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 500, color: 'var(--brand-soft)' }}>{anonId}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>Anonymous · Secure · Yours</p>
        </div>
      )}
      {step >= 5 && (
        <button
          className="btn-primary"
          onClick={onComplete}
          style={{ animation: 'pulse-soft 2s infinite', fontSize: 18, padding: '16px 36px' }}
        >
          Enter AnonThera →
        </button>
      )}
    </div>
  );
}

// ─── Main Onboarding Wrapper ─────────────────────────
const DOT_PAGES = 4;

export default function Onboarding({ onComplete, onLanguageSelect, onStrugglesSelect, anonId }) {
  const [screen, setScreen] = useState(0);

  const next = () => setScreen((s) => Math.min(s + 1, DOT_PAGES - 1));

  const slideStyle = (idx) => ({
    position: 'absolute', inset: 0, overflow: 'hidden',
    transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s',
    transform: idx === screen ? 'translateX(0)' : idx < screen ? 'translateX(-100%)' : 'translateX(100%)',
    opacity: idx === screen ? 1 : 0,
    pointerEvents: idx === screen ? 'auto' : 'none',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'linear-gradient(170deg, #1A1528 0%, #161220 60%, #1C1528 100%)',
      overflow: 'hidden',
    }}>
      {/* Page dots */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
        {Array.from({ length: DOT_PAGES }).map((_, i) => (
          <div key={i} style={{
            width: i === screen ? 20 : 6, height: 6, borderRadius: 3,
            background: i === screen ? 'var(--brand)' : 'rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Screens */}
      <div style={{ position: 'relative', height: '100%' }}>
        <div style={slideStyle(0)}><WelcomeScreen onNext={next} onSkip={onComplete} /></div>
        <div style={slideStyle(1)}><LanguageScreen onNext={next} onLanguageSelect={onLanguageSelect} /></div>
        <div style={slideStyle(2)}><StruggleScreen onNext={next} onStrugglesSelect={onStrugglesSelect} /></div>
        <div style={slideStyle(3)}><AnonRevealScreen onComplete={onComplete} anonId={anonId} /></div>
      </div>
    </div>
  );
}
