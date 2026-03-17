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
  const audioCtxRef = useRef(null);

  const isSupported = typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stopWaveform = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setWaveData([20, 35, 50, 35, 20]);
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      alert('Voice input requires Chrome, Edge, or Safari.');
      return;
    }

    // Stop completely before starting
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    stopWaveform();

    // 1. First set up Speech Recognition
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    recognitionRef.current = r;

    r.lang = LOCALE_MAP[languageCode] || 'en-IN';
    r.continuous = true; // KEEP continuous true so it doesn't stop immediately!
    r.interimResults = true;
    r.maxAlternatives = 1;

    let finalTranscriptBuf = '';

    r.onstart = () => {
      setIsListening(true);
      setInterim('');
    };

    r.onresult = (e) => {
      let interimBuf = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscriptBuf += text + ' ';
        } else {
          interimBuf += text;
        }
      }
      setInterim(interimBuf);
    };

    r.onerror = (e) => {
      console.warn('Voice error:', e.error);
      if (e.error === 'not-allowed') {
        alert('Microphone access denied.');
      }
      // Don't auto-stop on minor errors like 'no-speech'
      if (e.error === 'not-allowed' || e.error === 'network' || e.error === 'aborted') {
        setIsListening(false);
        stopWaveform();
      }
    };

    r.onend = () => {
      setIsListening(false);
      stopWaveform();
      if (finalTranscriptBuf.trim()) {
        onTranscript(finalTranscriptBuf.trim());
      } else if (interim.trim()) {
        // Fallback to whatever was caught interim
        onTranscript(interim.trim());
      }
      setInterim('');
    };

    try {
      r.start();
      
      // 2. NOW try starting the visualizer quietly, don't crash if it fails
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        src.connect(analyser);
        
        const dataArr = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!isListening) return; // Stop if not listening
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
      } catch (err) {
        console.warn("Visualizer start failed (harmless):", err);
        // Fallback visualizer
        animRef.current = setInterval(() => {
          setWaveData([Math.random()*20+10, Math.random()*30+15, Math.random()*40+20, Math.random()*30+15, Math.random()*20+10]);
        }, 150);
      }

    } catch (e) {
      console.error('Failed to start recognition:', e);
      setIsListening(false);
    }
  }, [isSupported, languageCode, stopWaveform, onTranscript, interim, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    // onend will handle the cleanup and submission
  }, []);

  return { isListening, startListening, stopListening, interim, waveData, isSupported };
};
