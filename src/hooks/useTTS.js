import { useState, useCallback, useRef } from 'react';

// Voice profiles — tuned for warmth in each language
const VOICE_PROFILES = {
  'en': { locale: 'en-IN', pitch: 1.08, rate: 0.88, preferGoogle: true },
  'hi': { locale: 'hi-IN', pitch: 1.05, rate: 0.84, preferGoogle: true },
  'ta': { locale: 'ta-IN', pitch: 1.03, rate: 0.82, preferGoogle: true },
  'te': { locale: 'te-IN', pitch: 1.03, rate: 0.82, preferGoogle: true },
  'kn': { locale: 'kn-IN', pitch: 1.03, rate: 0.82, preferGoogle: true },
};

// Strip ALL emojis so TTS doesn't read them as "moon emoji" etc.
const stripEmojis = (text) =>
  text.replace(/[\u{1F600}-\u{1F9FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{1FA00}-\u{1FAFF}\u{2702}-\u{27B0}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

// Split into sentences for natural pauses
const splitSentences = (text) => {
  return text
    .split(/(?<=[.!?।])\s+/)
    .filter((s) => s.trim().length > 0);
};

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const queueRef = useRef([]);
  const activeRef = useRef(null);

  // Get voices — waits for Chrome lazy load
  const getVoices = useCallback(() => {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) { resolve(voices); return; }
      window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1200);
    });
  }, []);

  // Find the best voice — prioritize Google voices (much more natural)
  const findBestVoice = useCallback((voices, locale) => {
    const langPrefix = locale.split('-')[0];

    // Priority 1: Google voice matching exact locale
    const googleExact = voices.find((v) => v.lang === locale && v.name.toLowerCase().includes('google'));
    if (googleExact) return googleExact;

    // Priority 2: Google voice matching language prefix
    const googlePrefix = voices.find((v) => v.lang.startsWith(langPrefix) && v.name.toLowerCase().includes('google'));
    if (googlePrefix) return googlePrefix;

    // Priority 3: Any Google voice for the language
    const googleAny = voices.find((v) => v.lang.startsWith(langPrefix) && (v.name.includes('Google') || v.name.includes('online')));
    if (googleAny) return googleAny;

    // Priority 4: Any voice matching locale exactly
    const exact = voices.find((v) => v.lang === locale);
    if (exact) return exact;

    // Priority 5: Any voice matching language prefix
    const prefix = voices.find((v) => v.lang.startsWith(langPrefix));
    if (prefix) return prefix;

    // Priority 6: Any English voice as final fallback
    return voices.find((v) => v.lang.startsWith('en')) || voices[0];
  }, []);

  const speak = useCallback(async (text, languageCode) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    queueRef.current = [];

    const profile = VOICE_PROFILES[languageCode] || VOICE_PROFILES['en'];
    const voices = await getVoices();
    const voice = findBestVoice(voices, profile.locale);

    if (import.meta.env.DEV) {
      console.log('[TTS] Using voice:', voice?.name, voice?.lang);
    }

    // Strip emojis first, then split into sentences
    const cleanText = stripEmojis(text);
    if (!cleanText) return;
    const sentences = splitSentences(cleanText);
    if (sentences.length === 0) return;

    setIsSpeaking(true);

    const speakNext = (index) => {
      if (index >= sentences.length) {
        setIsSpeaking(false);
        return;
      }

      const utter = new SpeechSynthesisUtterance(sentences[index]);
      if (voice) utter.voice = voice;
      utter.lang = profile.locale;
      utter.pitch = profile.pitch;
      utter.rate = profile.rate;
      utter.volume = 1;

      // Small pause between sentences for natural rhythm
      utter.onend = () => {
        setTimeout(() => speakNext(index + 1), 180);
      };
      utter.onerror = (e) => {
        console.warn('[TTS] error:', e.error);
        setIsSpeaking(false);
      };

      activeRef.current = utter;
      // Chrome bug: must wait 50ms after cancel before speak
      setTimeout(() => window.speechSynthesis.speak(utter), index === 0 ? 60 : 10);
    };

    speakNext(0);
  }, [getVoices, findBestVoice]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    queueRef.current = [];
    activeRef.current = null;
    setIsSpeaking(false);
  }, []);

  const isSupported = typeof window !== 'undefined' && Boolean(window.speechSynthesis);

  return { speak, stop, isSpeaking, isSupported };
};
