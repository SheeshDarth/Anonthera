import { useState, useRef, useCallback, useEffect } from 'react';

const LANG_MAP = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN',
};

// Generates fake sine wave data for the visualizer if actual microphone capture is blocked
const generateFakeWave = () => {
  const bars = [];
  const time = Date.now() / 200;
  for (let i = 0; i < 40; i++) {
    bars.push(Math.max(10, Math.abs(Math.sin(time + i * 0.2)) * 100 + Math.random() * 20));
  }
  return bars;
};

export const useVoice = (langCode, onTranscript) => {
  const [isListening, setIsListening] = useState(false);
  const [waveData, setWaveData]       = useState(Array(40).fill(0));

  const langRef      = useRef(langCode);
  const cbRef        = useRef(onTranscript);
  const recognitionRef = useRef(null);
  
  const animRef      = useRef(null);
  const fakeAnimRef  = useRef(null);
  const ctxRef       = useRef(null);
  const streamRef    = useRef(null);

  // keep refs fresh without recreating callbacks
  useEffect(() => { langRef.current = langCode; }, [langCode]);
  useEffect(() => { cbRef.current   = onTranscript; }, [onTranscript]);

  const isSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  /* ── cleanup helper ── */
  const teardownWave = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (fakeAnimRef.current) { clearInterval(fakeAnimRef.current); fakeAnimRef.current = null; }
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        t.stop();
        t.enabled = false;
      });
      streamRef.current = null;
    }
    setWaveData(Array(40).fill(0));
  }, []);

  /* ── stopListening ── */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    teardownWave();
  }, [teardownWave]);

  /* ── startListening ── */
  const startListening = useCallback(async () => {
    if (!isSupported) return;
    teardownWave();

    try {
      // 1. Setup the Web Speech API STT first (most important)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = LANG_MAP[langRef.current] || 'hi-IN';
      recognition.interimResults = false; // Need final results only
      recognition.maxAlternatives = 1;
      recognition.continuous = false; // Stop when the user stops talking

      recognition.onstart = () => {
        if (import.meta.env.DEV) console.log('[useVoice] Listening using Web Speech API');
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const txt = event.results[0][0].transcript;
        if (import.meta.env.DEV) console.log('[useVoice] Transcript:', txt);
        if (txt && cbRef.current) {
          cbRef.current(txt);
        }
      };

      recognition.onerror = (event) => {
        if (import.meta.env.DEV) console.log('[useVoice] STT Error:', event.error);
        // Ignore 'no-speech' error to prevent UI crashing, just quietly close.
        if (event.error !== 'no-speech') {
          console.warn('[useVoice] Handled error:', event.error);
        }
        setIsListening(false);
        teardownWave();
      };

      recognition.onend = () => {
        setIsListening(false);
        teardownWave();
      };

      recognitionRef.current = recognition;
      recognition.start();

      // 2. Setup the waveform visualizer (Microphone API)
      // Done in a non-blocking way so STT isn't impacted if it fails.
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const ctx = new AudioCtx();
          ctxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128; // gives 64 bins
          analyser.smoothingTimeConstant = 0.8;
          src.connect(analyser);
          const freq = new Uint8Array(analyser.frequencyBinCount);
          const step = Math.max(1, Math.floor(freq.length / 40));

          const draw = () => {
            analyser.getByteFrequencyData(freq);
            const bars = [];
            for (let i = 0; i < 40; i++) bars.push(freq[i * step] ?? 0);
            setWaveData(bars);
            animRef.current = requestAnimationFrame(draw);
          };
          draw();
        })
        .catch((err) => {
          console.warn('[useVoice] getUserMedia failed, using fake visualizer:', err);
          // If actual mic access fails (e.g. Chrome exclusive lock), show a fake wave animation
          fakeAnimRef.current = setInterval(() => setWaveData(generateFakeWave()), 50);
        });

    } catch (err) {
      if (import.meta.env.DEV) console.log('[useVoice] Critical STT error:', err);
      setIsListening(false);
      teardownWave();
    }
  }, [isSupported, teardownWave]);

  useEffect(() => {
    return () => {
      stopListening();
      teardownWave();
    };
  }, [stopListening, teardownWave]);

  return { isListening, startListening, stopListening, waveData, isSupported };
};
