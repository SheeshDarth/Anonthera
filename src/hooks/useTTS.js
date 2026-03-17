import { useState, useCallback, useRef, useEffect } from 'react';

const SARVAM_LANG_MAP = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
};

const splitSentences = (text) => {
  return text.split(/(?<=[.!?।])\s+/).reduce((acc, sentence) => {
    let current = sentence.trim();
    if (!current) return acc;
    if (current.length > 500) {
      const parts = current.match(/.{1,490}(\s|$)/g) || [current];
      acc.push(...parts.map(p => p.trim()).filter(Boolean));
    } else {
      acc.push(current);
    }
    return acc;
  }, []);
};

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioCtxRef = useRef(null);
  const playQueueRef = useRef([]);
  const activeSourcesRef = useRef([]);
  const isPlayingRef = useRef(false);
  const isCanceledRef = useRef(false);

  const initAudioCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const stop = useCallback(() => {
    isCanceledRef.current = true;
    isPlayingRef.current = false;
    setIsSpeaking(false);
    playQueueRef.current = [];
    activeSourcesRef.current.forEach(source => {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const playNextInQueue = () => {
    if (isCanceledRef.current) return;
    if (playQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }
    
    isPlayingRef.current = true;
    const buffer = playQueueRef.current.shift();
    const ctx = initAudioCtx();
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      playNextInQueue();
    };
    
    activeSourcesRef.current.push(source);
    source.start(0);
  };

  const speak = useCallback(async (text, languageCode) => {
    stop(); 
    isCanceledRef.current = false;
    if (!text) return;

    const apiKey = import.meta.env.VITE_SARVAM_KEY;

    if (!apiKey) {
      if (import.meta.env.DEV) console.log('[useTTS] Falling back to browser TTS');
      const utter = new SpeechSynthesisUtterance(text);
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis?.speak(utter);
      return;
    }

    const sentences = splitSentences(text);
    if (!sentences.length) return;

    setIsSpeaking(true);
    const targetLang = SARVAM_LANG_MAP[languageCode] || 'hi-IN';
    
    for (let i = 0; i < sentences.length; i++) {
      if (isCanceledRef.current) break;
      const chunk = sentences[i];
      if (import.meta.env.DEV) console.log(`[useTTS] Speaking chunk: ${i+1} / ${sentences.length}`);
      
      try {
        const res = await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'api-subscription-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: [chunk],
            target_language_code: targetLang,
            speaker: "meera",
            model: "bulbul:v1",
            pitch: 0,
            pace: 1.0,
            loudness: 1.5,
            enable_preprocessing: true
          })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const base64Audio = data.audios?.[0];
        if (!base64Audio) throw new Error("No audio returned");

        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) bytes[j] = binaryString.charCodeAt(j);

        const ctx = initAudioCtx();
        const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

        if (isCanceledRef.current) break;
        playQueueRef.current.push(audioBuffer);

        if (!isPlayingRef.current) {
          playNextInQueue();
        }

      } catch (err) {
        if (import.meta.env.DEV) console.log('[useTTS] TTS Error, falling back:', err);
        if (i === 0 && !isCanceledRef.current) {
          const utter = new SpeechSynthesisUtterance(sentences.slice(i).join(' '));
          utter.onstart = () => setIsSpeaking(true);
          utter.onend = () => setIsSpeaking(false);
          utter.onerror = () => setIsSpeaking(false);
          window.speechSynthesis?.speak(utter);
        }
        break; 
      }
    }
  }, [stop]);

  useEffect(() => {
    return stop;
  }, [stop]);

  return { speak, stop, isSpeaking };
};
