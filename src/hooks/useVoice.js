import { useState, useRef, useCallback } from 'react';

// Browser-native speech recognition locale map (all 5 languages)
const LOCALE_MAP = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
};

export const useVoice = (languageCode, onTranscript) => {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [waveData, setWaveData] = useState([20, 35, 50, 35, 20]);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);

  const isSupported = typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Animate waveform with live audio data or fallback animation
  const startWaveform = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      src.connect(analyser);
      analyserRef.current = analyser;
      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArr);
        setWaveData([
          Math.max(8, dataArr[1] / 3),
          Math.max(14, dataArr[3] / 2.5),
          Math.max(20, dataArr[5] / 2),
          Math.max(14, dataArr[3] / 2.5),
          Math.max(8, dataArr[1] / 3),
        ]);
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Fallback: CSS animation handles it  
      setWaveData([20, 40, 60, 40, 20]);
    }
  }, []);

  const stopWaveform = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    analyserRef.current = null;
    setWaveData([20, 35, 50, 35, 20]);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      alert('Voice input requires Chrome or Edge browser.');
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    recognitionRef.current = r;

    const locale = LOCALE_MAP[languageCode] || 'en-IN';
    r.lang = locale;
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => {
      setIsListening(true);
      setInterim('');
      startWaveform();
    };

    r.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }
      if (finalText) {
        onTranscript(finalText.trim());
        setInterim('');
      } else {
        setInterim(interimText);
      }
    };

    r.onerror = (e) => {
      console.warn('Voice error:', e.error);
      setIsListening(false);
      stopWaveform();
      if (e.error === 'not-allowed') {
        alert('Microphone access was denied. Allow it in browser settings and try again.');
      }
    };

    r.onend = () => {
      setIsListening(false);
      stopWaveform();
    };

    try {
      r.start();
    } catch (e) {
      console.error('Failed to start:', e);
      setIsListening(false);
    }
  }, [isSupported, languageCode, onTranscript, startWaveform, stopWaveform]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
    stopWaveform();
  }, [stopWaveform]);

  return { isListening, startListening, stopListening, interim, waveData, isSupported };
};
