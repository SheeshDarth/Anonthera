import React from 'react';

export default function SOSBanner({ onOpenHelp, onDismiss }) {
  const vibrate = () => { try { navigator.vibrate?.([100, 50, 100, 50, 100]); } catch (e) { console.warn(e); } };

  React.useEffect(() => { vibrate(); }, []);

  return (
    <div className="sos-banner" style={{ margin: '8px 12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 32, animation: 'float 2s ease-in-out infinite' }}>💙</span>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#FCA5A5' }}>You don't have to face this alone.</p>
          <p style={{ fontSize: 13, color: 'rgba(252,165,165,0.8)', marginTop: 2, lineHeight: 1.5 }}>
            Real people are here right now.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a
          href="tel:9152987821"
          style={{
            flex: 1, textAlign: 'center', padding: '10px 16px', borderRadius: 100,
            background: '#EF4444', color: 'white', fontWeight: 700, fontSize: 14,
            textDecoration: 'none', minWidth: 120,
          }}
        >
          📞 Call iCall
        </a>
        <a
          href="https://wa.me/918686139139"
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1, textAlign: 'center', padding: '10px 16px', borderRadius: 100,
            background: '#075E54', color: 'white', fontWeight: 700, fontSize: 14,
            textDecoration: 'none', minWidth: 120,
          }}
        >
          💬 WhatsApp
        </a>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onOpenHelp}
          style={{
            flex: 1, padding: '8px', background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100,
            color: '#FCA5A5', fontSize: 13, cursor: 'pointer',
          }}
        >
          More resources →
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '8px 16px', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100,
            color: 'rgba(252,165,165,0.7)', fontSize: 13, cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
