import React from 'react';

const LANGS = [
  { label: 'English', flag: '🇬🇧', native: 'English', code: 'en' },
  { label: 'हिंदी', flag: '🇮🇳', native: 'हिंदी', code: 'hi' },
  { label: 'தமிழ்', flag: '🇮🇳', native: 'தமிழ்', code: 'ta' },
  { label: 'తెలుగు', flag: '🇮🇳', native: 'తెలుగు', code: 'te' },
  { label: 'ಕನ್ನಡ', flag: '🇮🇳', native: 'ಕನ್ನಡ', code: 'kn' },
];

export default function LanguageSheet({ current, onSelect, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', width: '100%', background: '#160D2E',
        borderRadius: '24px 24px 0 0', padding: '8px 0 32px',
        border: '1px solid rgba(255,255,255,0.08)', animation: 'slide-up 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4, margin: '8px auto 20px' }} />
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Choose Language
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 16px' }}>
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => { onSelect(l); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: current.code === l.code ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: current.code === l.code ? 'var(--brand-light)' : 'var(--text-primary)',
                fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 16, fontWeight: 600,
                transition: 'all 0.15s', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 24 }}>{l.flag}</span>
              <span>{l.native}</span>
              {current.code === l.code && <span style={{ marginLeft: 'auto', color: 'var(--brand)' }}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
