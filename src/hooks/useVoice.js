import { useState, useRef, useCallback, useEffect } from 'react';

const SARVAM_LANG_MAP = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
};

const getSupportedMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/wav'];
    for (const type of types) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return ''; // fallback
};

export const useVoice = (languageCode, onTranscript) => {
  const [isListening, setIsListening] = useState(false);
  const [waveData, setWaveData] = useState(Array(40).fill(0));
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animRef = useRef(null);

  const isSupported = typeof window !== 'undefined' && 
                      !!navigator.mediaDevices?.getUserMedia && 
                      typeof MediaRecorder !== 'undefined';

  const cleanup = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }
    setWaveData(Array(40).fill(0));
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      console.warn('Voice input requires a modern browser.');
      return;
    }
    cleanup();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const draw = () => {
            if (!streamRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            // Slice the first 40 bins to match requirement and normalize mapping implicitly
            setWaveData(Array.from(dataArray).slice(0, 40));
            animRef.current = requestAnimationFrame(draw);
        };
        draw();

        const mimeType = getSupportedMimeType();
        if (import.meta.env.DEV) {
            console.log('[useVoice] Recording started, mimeType:', mimeType);
        }

        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            setIsListening(false);
            const apiKey = import.meta.env.VITE_SARVAM_KEY;
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
            cleanup();
            
            if (audioBlob.size === 0) {
                onTranscript('');
                return;
            }

            if (!apiKey) {
                console.error('[useVoice] Missing VITE_SARVAM_KEY in environment variables.');
                onTranscript('');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('file', audioBlob, 'recording.webm');
                formData.append('language_code', SARVAM_LANG_MAP[languageCode] || 'hi-IN');
                formData.append('model', 'saarika:v1');

                const response = await fetch('https://api.sarvam.ai/speech-to-text', {
                    method: 'POST',
                    headers: { 'api-subscription-key': apiKey },
                    body: formData
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                
                const transcript = data.transcript || '';
                if (import.meta.env.DEV) {
                    console.log('[useVoice] Transcript received:', transcript);
                }
                onTranscript(transcript.trim());
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.log('[useVoice] ASR Error:', err);
                }
                onTranscript(''); // Fail silently without breaking
            }
        };

        mediaRecorder.start();
        setIsListening(true);
    } catch (err) {
        if (import.meta.env.DEV) console.log('[useVoice] ASR Error:', err);
        setIsListening(false);
        cleanup();
    }
  }, [isSupported, languageCode, onTranscript, cleanup]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
  }, []);

  return { isListening, startListening, stopListening, waveData, isSupported };
};
