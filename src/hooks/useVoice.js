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
  const [interimText, setInterimText] = useState('');
  const [activeStream, setActiveStream] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const speechRecoRef = useRef(null);

  const isSupported = typeof window !== 'undefined' && 
                      !!navigator.mediaDevices?.getUserMedia && 
                      typeof MediaRecorder !== 'undefined';

  const cleanup = useCallback(() => {
    if (speechRecoRef.current) {
        try { speechRecoRef.current.stop(); } catch(e){}
        speechRecoRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setActiveStream(null);
    }
    setInterimText('');
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
        setActiveStream(stream); // triggering re-render to pass stream to visualizer

        // Setup SpeechRecognition for UI interim immediately printing words
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const reco = new SpeechRecognition();
            reco.continuous = true;
            reco.interimResults = true;
            reco.lang = SARVAM_LANG_MAP[languageCode] || 'en-IN';
            
            reco.onresult = (event) => {
                let currentInterim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    currentInterim += event.results[i][0].transcript;
                }
                setInterimText(currentInterim);
            };
            reco.onerror = (e) => { if (import.meta.env.DEV) console.log('[useVoice] Reco error:', e); };
            
            speechRecoRef.current = reco;
            try { reco.start(); } catch(e){}
        }

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
            
            // Capture interim fallback in case Sarvam fails 
            const finalInterim = interimText;
            cleanup();
            
            if (audioBlob.size === 0) {
                onTranscript('');
                return;
            }

            if (!apiKey) {
                console.error('[useVoice] Missing VITE_SARVAM_KEY in environment variables.');
                onTranscript(finalInterim);
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
                
                // If Sarvam gives empty result due to silence but web API caught something, fallback
                if (!transcript.trim() && finalInterim.trim()) {
                   onTranscript(finalInterim.trim());
                } else {
                   onTranscript(transcript.trim());
                }
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.log('[useVoice] ASR Error:', err);
                }
                onTranscript(finalInterim.trim()); // Fail gracefully with visual STT text
            }
        };

        mediaRecorder.start();
        setIsListening(true);
    } catch (err) {
        if (import.meta.env.DEV) console.log('[useVoice] ASR Error:', err);
        setIsListening(false);
        cleanup();
    }
  }, [isSupported, languageCode, onTranscript, cleanup, interimText]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
  }, []);

  return { isListening, startListening, stopListening, activeStream, interimText, isSupported };
};
