import { useState, useCallback, useRef, useEffect } from 'react';

const LANG_MAP = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN',
};

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const stopSignal = useRef(false);

  const stop = useCallback(() => {
    stopSignal.current = true;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text, langCode) => {
    stop();
    stopSignal.current = false;
    if (!text || !window.speechSynthesis) return;

    if (import.meta.env.DEV) console.log('[useTTS] Speaking using native Google Web Speech API');

    const lang = LANG_MAP[langCode] || 'hi-IN';
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    
    // Optimal pace for therapeutic responses
    u.rate = 0.95;
    u.pitch = 1.0;

    // Force select Google's cloud voices if available on Chrome/Android
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang === lang && (v.name.includes('Google') || v.name.includes('Online'))) ||
                           voices.find(v => v.lang === lang) ||
                           voices.find(v => v.lang.startsWith(langCode));
                           
    if (preferredVoice) {
      u.voice = preferredVoice;
    }

    u.onstart = () => {
      if (!stopSignal.current) setIsSpeaking(true);
    };
    u.onend = () => {
      if (!stopSignal.current) setIsSpeaking(false);
    };
    u.onerror = (e) => {
      // Ignore abort errors caused by us calling stop()
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('[useTTS] Speech synthesis error:', e.error);
      }
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(u);
  }, [stop]);

  useEffect(() => {
    // Attempt to pre-load voices immediately
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    return stop;
  }, [stop]);

  return { speak, stop, isSpeaking };
};
