import React, { useEffect, useRef, useState, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAI } from '../../hooks/useAI';
import { useVoice } from '../../hooks/useVoice';
import { useTTS } from '../../hooks/useTTS';
import { detectCrisis } from '../../utils/crisisDetect';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import SOSBanner from './SOSBanner';
import LanguageSheet from '../shared/LanguageSheet';
import { showToast } from '../shared/Toast';

const makeId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ── Language-aware greetings ──────────────────────────
const GREETINGS = {
  en: {
    night:   "Hey night owl 🌙 Can't sleep? I'm here whenever you need.",
    morning: "Good morning ☀️ How are you feeling today?",
    afternoon: "Hey there 🌿 How's your day going?",
    evening: "Good evening 🌅 How was today?",
    late:    "Hey, you're up late 🌙 What's on your mind?",
  },
  hi: {
    night:   "अरे, नींद नहीं आ रही? 🌙 मैं यहाँ हूँ।",
    morning: "सुप्रभात ☀️ आज कैसा महसूस हो रहा है?",
    afternoon: "नमस्ते 🌿 दिन कैसा चल रहा है?",
    evening: "शुभ संध्या 🌅 आज का दिन कैसा रहा?",
    late:    "अरे, इतनी रात को जागे हो? 🌙 क्या चल रहा है?",
  },
  ta: {
    night:   "இரவு நேரமா? 🌙 தூக்கம் வரலையா? நான் இங்கே இருக்கிறேன்.",
    morning: "காலை வணக்கம் ☀️ இன்று எப்படி இருக்கிறீர்கள்?",
    afternoon: "வணக்கம் 🌿 இன்றைய நாள் எப்படி போகிறது?",
    evening: "மாலை வணக்கம் 🌅 இன்று எப்படி இருந்தது?",
    late:    "இவ்வளவு நேரமா? 🌙 மனதில் என்ன இருக்கிறது?",
  },
  te: {
    night:   "రాత్రి మెలకువగా ఉన్నారా? 🌙 నేను ఇక్కడ ఉన్నాను.",
    morning: "శుభోదయం ☀️ ఈరోజు ఎలా ఉన్నారు?",
    afternoon: "నమస్కారం 🌿 రోజు ఎలా జరుగుతోంది?",
    evening: "శుభ సాయంత్రం 🌅 ఈరోజు ఎలా గడిచింది?",
    late:    "ఇంత రాత్రి జాగారం చేస్తున్నారా? 🌙",
  },
  kn: {
    night:   "ರಾತ್ರಿ ಎಚ್ಚರವಾಗಿದ್ದೀರಾ? 🌙 ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.",
    morning: "ಶುಭೋದಯ ☀️ ಇಂದು ಹೇಗಿದ್ದೀರಿ?",
    afternoon: "ನಮಸ್ಕಾರ 🌿 ದಿನ ಹೇಗೆ ಹೋಗ್ತಿದೆ?",
    evening: "ಶುಭ ಸಂಜೆ 🌅 ಇಂದು ಹೇಗಿತ್ತು?",
    late:    "ಇಷ್ಟು ಹೊತ್ತು ಎಚ್ಚರ? 🌙 ಏನು ಮನಸ್ಸಲ್ಲಿ?",
  },
};

const getGreeting = (langCode) => {
  const h = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
  const g = GREETINGS[langCode] || GREETINGS.en;
  if (h < 6)  return g.night;
  if (h < 12) return g.morning;
  if (h < 17) return g.afternoon;
  if (h < 21) return g.evening;
  return g.late;
};

export default function Chat({
  language,
  user,
  anonId,
  struggles,
  onPeerNudge,
  onOpenHelp,
  prefillText,
  onConsumePrefill,
  onLanguageChange,
}) {
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [showSOS, setShowSOS]             = useState(false);
  const [userMsgCount, setUserMsgCount]   = useState(0);
  const [showLangSheet, setShowLangSheet] = useState(false);
  const [autoPlayTTS, setAutoPlayTTS]     = useState(false);
  const [showMenu, setShowMenu]           = useState(false);
  const endRef     = useRef(null);
  const pendingRef = useRef(false);

  const { sendMessage, isLoading } = useAI(language, user);
  const { speak, stop, isSpeaking } = useTTS();

  const onTranscript = useCallback((text) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  }, []);
  const { isListening, startListening, stopListening, waveData, isSupported: voiceSupported } =
    useVoice(language.code, onTranscript);

  // Scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  // Language-aware greeting
  useEffect(() => {
    setMessages([{ id: makeId(), role: 'assistant', text: getGreeting(language.code), welcome: true }]);
  }, []); // eslint-disable-line

  // Bridge from Mood tab
  useEffect(() => {
    if (prefillText) { setInput(prefillText); onConsumePrefill?.(); }
  }, [prefillText, onConsumePrefill]);

  const handleSignOut = async () => {
    setShowMenu(false);
    try {
      await signOut(auth);
      localStorage.removeItem('anonthera_onboarded');
      window.location.reload();
    } catch (e) { console.error(e); }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || pendingRef.current) return;
    pendingRef.current = true;
    const userText = input.trim();
    const newCount = userMsgCount + 1;
    setUserMsgCount(newCount);
    setInput('');

    const userMsg = { id: makeId(), role: 'user', text: userText };
    let historySnapshot = [];
    setMessages((prev) => { historySnapshot = [...prev, userMsg]; return historySnapshot; });

    try {
      await new Promise((r) => setTimeout(r, 30));
      const aiText = await sendMessage(userText, historySnapshot);
      if (!aiText) return;
      if (detectCrisis(userText) || detectCrisis(aiText)) setShowSOS(true);
      const nudge = newCount % 4 === 0 && !detectCrisis(aiText);
      setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', text: aiText, nudge }]);
      if (autoPlayTTS) speak(aiText, language.code);
    } catch (e) { console.error(e); }
    finally { pendingRef.current = false; }
  }, [input, isLoading, userMsgCount, sendMessage, autoPlayTTS, speak, language.code]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', height: 'var(--header-height)',
        background: 'rgba(15,13,21,0.95)', borderBottom: '1px solid rgba(255,250,243,0.05)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="" style={{ width: 24, height: 24, borderRadius: 6 }} />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>AnonThera</span>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <button onClick={() => setShowLangSheet(true)} className="lang-pill" style={{ border: 'none', cursor: 'pointer', fontSize: 12 }}>
            <span>{language.flag}</span>
            <span>{language.native}</span>
          </button>
          <button
            onClick={() => setAutoPlayTTS((t) => !t)}
            title={autoPlayTTS ? 'Auto-speak ON' : 'Auto-speak OFF'}
            style={{ width: 30, height: 30, border: 'none', cursor: 'pointer', borderRadius: '50%', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: autoPlayTTS ? 'var(--brand-dim)' : 'transparent', color: autoPlayTTS ? 'var(--brand-soft)' : 'var(--text-muted)' }}
          >
            {autoPlayTTS ? '🔊' : '🔇'}
          </button>
          <div className="anon-id-chip">{anonId}</div>
          <button onClick={() => setShowMenu((s) => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: '0 2px' }}>⋮</button>
          {showMenu && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 300, background: 'var(--bg-card)', border: '1px solid rgba(255,245,235,0.1)', borderRadius: 12, padding: '4px 0', minWidth: 150, boxShadow: '0 8px 28px rgba(0,0,0,0.5)' }}>
              <button onClick={handleSignOut} style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13, textAlign: 'left', fontFamily: 'inherit' }}>Sign out</button>
            </div>
          )}
        </div>
      </div>

      {showSOS && <SOSBanner onOpenHelp={onOpenHelp} onDismiss={() => setShowSOS(false)} />}

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 4px' }} onClick={() => showMenu && setShowMenu(false)}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} languageCode={language.code} onPeerNudge={onPeerNudge} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      {/* ── Voice ── */}
      {isListening && (
        <div style={{ padding: '8px 14px', background: 'rgba(155,114,207,0.06)', borderTop: '1px solid rgba(155,114,207,0.15)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div className="waveform-bars">
            {waveData.map((h, i) => <div key={i} className="wave-bar" style={{ height: `${Math.max(5, h * 0.22)}px` }} />)}
          </div>
          <span style={{ fontSize: 12, color: 'var(--brand-soft)', fontStyle: 'italic', flex: 1 }}>Listening…</span>
          <button onClick={stopListening} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>Done ✓</button>
        </div>
      )}

      {/* ── Input ── */}
      <div style={{
        padding: '8px 12px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
        background: 'rgba(15,13,21,0.96)', borderTop: '1px solid rgba(255,250,243,0.05)',
        display: 'flex', gap: 9, alignItems: 'flex-end', flexShrink: 0,
        marginBottom: 'var(--nav-height)',
      }}>
        {voiceSupported && (
          <button className={`mic-btn ${isListening ? 'recording' : ''}`} onClick={isListening ? stopListening : startListening}>
            <span style={{ fontSize: 18 }}>{isListening ? '⏹' : '🎤'}</span>
          </button>
        )}
        <textarea
          className="chat-input" value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Type or speak…" rows={1}
          style={{ resize: 'none', maxHeight: 96, overflowY: 'auto', paddingTop: 12, paddingBottom: 12 }}
          onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'; }}
        />
        <button className="btn-primary" onClick={handleSend} disabled={!input.trim() || isLoading} style={{ padding: '12px 16px', fontSize: 17, flexShrink: 0 }}>
          {isLoading ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: 16 }}>⟳</span> : '↑'}
        </button>
      </div>

      {showLangSheet && (
        <LanguageSheet
          current={language}
          onSelect={(l) => { onLanguageChange?.(l); showToast(`${l.native} ${l.flag}`); if (isSpeaking) stop(); }}
          onClose={() => setShowLangSheet(false)}
        />
      )}
    </div>
  );
}
