import React, { useState, useEffect, useRef } from 'react';
import { usePeerMatch } from '../../hooks/usePeerMatch';

// ─── Radar Animation Component ────────────────────────
function PeerRadar({ onCancel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32 }}>
      {/* Sonar rings */}
      <div style={{ position: 'relative', width: 200, height: 200, marginBottom: 32 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="radar-ring" style={{
            width: '100%', height: '100%',
            top: 0, left: 0,
            animationDelay: `${i * 0.66}s`,
          }} />
        ))}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4C1D95, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, boxShadow: '0 0 30px rgba(124,58,237,0.6)',
        }}>🫂</div>
      </div>
      <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        Finding someone who understands...
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
        Usually under 30 seconds
      </p>
      <button className="btn-ghost" onClick={onCancel} style={{ fontSize: 14 }}>Cancel</button>
    </div>
  );
}

// ─── Chat Component ───────────────────────────────────
function PeerChatView({ peerInfo, messages, anonId, onSend, onEnd, onReport }) {
  const [input, setInput] = useState('');
  const [showReport, setShowReport] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  const REPORT_REASONS = ['This feels uncomfortable', 'Inappropriate content', 'I feel unsafe'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: 'rgba(13,8,32,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="anon-id-chip">{peerInfo?.anonId || 'Unknown Peer'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <div className="open-dot" />
              <span style={{ fontSize: 12, color: 'var(--success)' }}>{peerInfo?.sharedStruggle}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowReport(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }} title="Report">🚩</button>
            <button onClick={onEnd} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }} title="End chat">✕</button>
          </div>
        </div>
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
          <p style={{ fontSize: 12, color: 'var(--warning)', lineHeight: 1.5 }}>⚠️ This is a peer, not a professional. For crisis support → Help tab</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>👋</p>
            <p style={{ fontSize: 14 }}>You're connected! Say hello.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderAnonId === anonId;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              {isMe ? (
                <div className="bubble-user"><p style={{ fontSize: 15, margin: 0 }}>{msg.text}</p></div>
              ) : (
                <div className="bubble-peer"><p style={{ fontSize: 15, margin: 0, color: '#99F6E4' }}>{msg.text}</p></div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10, background: 'rgba(13,8,32,0.95)', flexShrink: 0, marginBottom: 'var(--nav-height)' }}>
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Say something kind…"
          style={{ borderRadius: 100 }}
        />
        <button className="btn-primary" onClick={send} disabled={!input.trim()} style={{ padding: '12px 18px', fontSize: 18, borderRadius: 100 }}>↑</button>
      </div>

      {/* Report Sheet */}
      {showReport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={() => setShowReport(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', width: '100%', background: '#160D2E', borderRadius: '24px 24px 0 0', padding: '24px 16px 40px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Report this chat</p>
            {REPORT_REASONS.map((r) => (
              <button key={r} onClick={() => { onReport(r); setShowReport(false); }} style={{
                width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, color: 'var(--text-primary)', fontSize: 15, cursor: 'pointer', marginBottom: 8, textAlign: 'left',
              }}>{r}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lobby ─────────────────────────────────────────────
function PeerLobby({ struggles, onFind }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 72, marginBottom: 24, animation: 'float 4s ease-in-out infinite' }}>🫂</div>
      <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Talk to someone who gets it</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, maxWidth: 280, marginBottom: 24 }}>
        Fully anonymous. Matched by shared struggle. Real connection.
      </p>
      {struggles?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
          {struggles.slice(0, 4).map((s) => <span key={s} className="tag-pill selected">{s}</span>)}
        </div>
      )}
      <button className="btn-primary" onClick={onFind} style={{ fontSize: 18, padding: '16px 40px', marginBottom: 24 }}>Find a Peer</button>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['🔒 Anonymous forever', '🚫 Be respectful', '🆘 Help always here'].map((t) => (
          <span key={t} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── No Match State ───────────────────────────────────
function NoMatchView({ onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32, textAlign: 'center' }}>
      <div className="no-peer-art" style={{ marginBottom: 24 }}>🪑🪑</div>
      <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No one available right now</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, maxWidth: 260 }}>Check back soon — AnonThera is always here to listen 💬</p>
      <button className="btn-primary" onClick={onBack}>Back to Lobby</button>
    </div>
  );
}

// ─── Main PeerTab ─────────────────────────────────────
export default function PeerTab({ user, anonId, struggles }) {
  const { state, peerInfo, peerMessages, findPeer, sendPeerMessage, endChat, reportPeer } = usePeerMatch(user, struggles || [], anonId);

  if (state === 'lobby') return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><PeerLobby struggles={struggles} onFind={findPeer} /></div>;
  if (state === 'searching') return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><PeerRadar onCancel={endChat} /></div>;
  if (state === 'no-match') return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><NoMatchView onBack={endChat} /></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <PeerChatView peerInfo={peerInfo} messages={peerMessages} anonId={anonId} onSend={sendPeerMessage} onEnd={endChat} onReport={reportPeer} />
    </div>
  );
}
