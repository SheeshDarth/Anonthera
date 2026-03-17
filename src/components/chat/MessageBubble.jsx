import React, { useState, useEffect } from 'react';
import { useTTS } from '../../hooks/useTTS';

export default function MessageBubble({ message, languageCode, onPeerNudge }) {
  const { speak, stop, isSpeaking } = useTTS();
  const isUser = message.role === 'user';
  const [localSpeaking, setLocalSpeaking] = useState(false);

  // Track when TTS ends
  useEffect(() => {
    if (!isSpeaking) setLocalSpeaking(false);
  }, [isSpeaking]);

  const handleSpeak = () => {
    if (localSpeaking) { stop(); setLocalSpeaking(false); return; }
    speak(message.text, languageCode);
    setLocalSpeaking(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
      {/* AI bubble */}
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <img src="/logo.png" alt="" style={{
            width: 26, height: 26, borderRadius: 8,
            flexShrink: 0, boxShadow: '0 2px 8px rgba(155,114,207,0.2)',
          }} />
          <div>
            <div className="bubble-ai">
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-primary)', margin: 0 }}>{message.text}</p>
            </div>
            {/* Listen button */}
            <button
              onClick={handleSpeak}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 6px 0', fontSize: 12, color: 'var(--text-muted)',
                transition: 'color 0.18s',
              }}
              title={localSpeaking ? 'Stop' : 'Listen'}
            >
              {localSpeaking ? (
                <>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 14 }}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="audio-wave-bar" style={{
                        height: `${5 + (i % 3) * 4}px`,
                        animationDelay: `${i * 0.12}s`,
                      }} />
                    ))}
                  </div>
                  <span>Stop</span>
                </>
              ) : (
                <>🔊 <span>Listen</span></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* User bubble */}
      {isUser && (
        <div className="bubble-user">
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: '#fff', margin: 0 }}>{message.text}</p>
        </div>
      )}

      {/* Peer nudge */}
      {message.nudge && !isUser && (
        <div style={{
          marginTop: 10, marginLeft: 34,
          padding: '14px 16px', borderRadius: 'var(--radius-md)',
          background: 'rgba(123,174,154,0.1)',
          border: '1px solid rgba(123,174,154,0.25)',
          maxWidth: '82%', animation: 'slide-up 0.35s ease',
        }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
            Want to talk to someone who's been through something similar? Completely anonymous — they'd never know who you are. 🫂
          </p>
          <button
            className="btn-primary"
            onClick={onPeerNudge}
            style={{ fontSize: 13.5, padding: '9px 18px' }}
          >
            Find a Peer
          </button>
        </div>
      )}
    </div>
  );
}
