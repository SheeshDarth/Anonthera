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
  const [isVoiceMode, setIsVoiceMode]     = useState(false);
  const endRef     = useRef(null);
  const pendingRef = useRef(false);

  const { sendMessage, isLoading } = useAI(language, user);
  const { speak, stop: stopTTS, isSpeaking } = useTTS();

  const { isListening, startListening, stopListening, waveData, isSupported: voiceSupported } =
    useVoice(language.code, (text) => {
      if (isVoiceMode) {
        // Auto-send in voice mode
        if (text.trim() && !isLoading) {
          handleSend(text.trim());
        }
      } else {
        setInput((prev) => (prev ? `${prev} ${text}` : text));
      }
    });

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

  const handleSend = useCallback(async (textOverride = null) => {
    const userText = typeof textOverride === 'string' ? textOverride : input.trim();
    if (!userText || isLoading || pendingRef.current) return;
    
    pendingRef.current = true;
    const newCount = userMsgCount + 1;
    setUserMsgCount(newCount);
    if (!textOverride) setInput('');

    const userMsg = { id: makeId(), role: 'user', text: userText };
    let historySnapshot = [];
    setMessages((prev) => { historySnapshot = [...prev, userMsg]; return historySnapshot; });

    try {
      if (isVoiceMode) stopListening(); // Briefly stop listening while AI thinks
      await new Promise((r) => setTimeout(r, 30));
      const aiText = await sendMessage(userText, historySnapshot);
      if (!aiText) return;
      if (detectCrisis(userText) || detectCrisis(aiText)) setShowSOS(true);
      const nudge = newCount % 4 === 0 && !detectCrisis(aiText);
      setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', text: aiText, nudge }]);
      
      if (autoPlayTTS || isVoiceMode) {
        // In voice mode, we want continuous conversation: auto-start mic after TTS finishes
        speak(aiText, language.code, isVoiceMode ? () => {
            if (!pendingRef.current) startListening();
        } : null);
      }
    } catch (e) { console.error(e); }
    finally { pendingRef.current = false; }
  }, [input, isLoading, userMsgCount, sendMessage, autoPlayTTS, isVoiceMode, speak, language.code, stopListening, startListening]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleVoiceMode = () => {
    if (!isVoiceMode) {
      setIsVoiceMode(true);
      if (!isListening) startListening();
      showToast("Entering Voice Mode 🎙️");
    } else {
      setIsVoiceMode(false);
      stopListening();
      stopTTS();
      showToast("Returned to Text Chat 💬");
    }
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
          {voiceSupported && (
            <button
              onClick={toggleVoiceMode}
              title={isVoiceMode ? 'Switch to Chat' : 'Switch to Voice Mode'}
              style={{
                background: isVoiceMode ? 'var(--brand)' : 'rgba(255,245,235,0.06)',
                border: '1px solid rgba(255,245,235,0.1)', cursor: 'pointer',
                borderRadius: '16px', padding: '6px 12px', color: isVoiceMode ? '#fff' : 'var(--text-primary)',
                fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
              }}
            >
              🎙️ {isVoiceMode ? 'Voice' : 'Chat'}
            </button>
          )}
          <button onClick={() => setShowLangSheet(true)} className="lang-pill" style={{ border: 'none', cursor: 'pointer', fontSize: 12 }}>
            <span>{language.flag}</span>
            <span>{language.native}</span>
          </button>
          {!isVoiceMode && (
            <button
              onClick={() => setAutoPlayTTS((t) => !t)}
              title={autoPlayTTS ? 'Auto-speak ON' : 'Auto-speak OFF'}
              style={{ width: 30, height: 30, border: 'none', cursor: 'pointer', borderRadius: '50%', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: autoPlayTTS ? 'var(--brand-dim)' : 'transparent', color: autoPlayTTS ? 'var(--brand-soft)' : 'var(--text-muted)' }}
            >
              {autoPlayTTS ? '🔊' : '🔇'}
            </button>
          )}
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

      {/* ── Messages or Voice UI ── */}
      {isVoiceMode ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{
            width: 140, height: 140, borderRadius: '50%',
            background: isSpeaking ? 'radial-gradient(circle, var(--brand) 0%, transparent 80%)' : 'radial-gradient(circle, rgba(139,108,193,0.2) 0%, transparent 80%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 40,
            animation: isSpeaking || isListening ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
            boxShadow: isSpeaking ? '0 0 40px var(--brand)' : 'none',
            transition: 'all 0.4s ease'
          }}>
            <span style={{ fontSize: 64 }}>{isSpeaking ? '🤖' : (isListening ? '🎙️' : '💬')}</span>
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {isLoading ? 'Thinking...' : isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Voice Mode'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, textAlign: 'center', maxWidth: 280 }}>
            {isListening ? 'Speak naturally, I am listening.' : 'Talk to me just like a friend.'}
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 4px' }} onClick={() => showMenu && setShowMenu(false)}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} languageCode={language.code} onPeerNudge={onPeerNudge} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={endRef} />
        </div>
      )}

      {/* ── Voice (Text Mode) ── */}
      {!isVoiceMode && isListening && (
        <div style={{ padding: '8px 14px', background: 'rgba(155,114,207,0.06)', borderTop: '1px solid rgba(155,114,207,0.15)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div className="waveform-bars">
            {waveData.map((h, i) => <div key={i} className="wave-bar" style={{ height: `${Math.max(5, h * 0.22)}px` }} />)}
          </div>
          <span style={{ fontSize: 12, color: 'var(--brand-soft)', fontStyle: 'italic', flex: 1 }}>Listening…</span>
          <button onClick={stopListening} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>Done ✓</button>
        </div>
      )}

      {/* ── Input ── */}
      {!isVoiceMode && (
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
          <button className="btn-primary" onClick={() => handleSend()} disabled={!input.trim() || isLoading} style={{ padding: '12px 16px', fontSize: 17, flexShrink: 0 }}>
            {isLoading ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: 16 }}>⟳</span> : '↑'}
          </button>
        </div>
      )}
      
      {/* ── Voice Wave Panel for Voice Mode ── */}
      {isVoiceMode && (
         <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 'var(--nav-height)', background: 'var(--bg-card)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="waveform-bars" style={{ gap: 8, height: 60, alignItems: 'center' }}>
              {waveData.map((h, i) => <div key={i} className="wave-bar" style={{ width: 6, height: `${Math.max(10, h * 0.4)}px`, background: isSpeaking ? 'var(--brand)' : 'var(--brand-soft)' }} />)}
            </div>
            
            <button 
              className="btn-primary" 
              onClick={isListening ? stopListening : startListening}
              style={{
                borderRadius: '50%', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isListening ? 'var(--danger)' : 'var(--brand)',
                boxShadow: isListening ? '0 4px 16px rgba(239,68,68,0.4)' : '0 4px 16px rgba(139,108,193,0.4)',
              }}
            >
              <span style={{ fontSize: 24 }}>{isListening ? '⏹' : '🎤'}</span>
            </button>
         </div>
      )}

      {showLangSheet && (
        <LanguageSheet
          current={language}
          onSelect={(l) => { onLanguageChange?.(l); showToast(`${l.native} ${l.flag}`); if (isSpeaking) stopTTS(); }}
          onClose={() => setShowLangSheet(false)}
        />
      )}
    </div>
  );
}
