import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

export const useVoice = (languageCode, onTranscript) => {
  const [isListening, setIsListening] = useState(false);
  const [waveData, setWaveData] = useState([20, 35, 50, 35, 20]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  
  // Note: We use a custom unmount / cleanup
  const stopWaveform = useCallback(() => {
    if (animRef.current) clearInterval(animRef.current);
    if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }
    setWaveData([20, 35, 50, 35, 20]);
  }, []);

  const processAudio = async (audioBlob) => {
    const apiKey = import.meta.env.VITE_SARVAM_API_KEY;
    if (!apiKey) {
        console.warn("[Voice] Missing VITE_SARVAM_API_KEY");
        return;
    }

    try {
        const formData = new FormData();
        // Sarvam expects the audio file, prompt (optional), and model.
        // It's a translate STT endpoint, so it will always translate to English natively. 
        // We will pass the detected language as a prompt hint if needed, or leave it blank to auto-detect.
        formData.append('file', audioBlob, 'recording.wav');
        formData.append('prompt', '');
        formData.append('model', 'saaras:v1');

        const response = await axios.post(
            'https://api.sarvam.ai/speech-to-text-translate',
            formData,
            {
                headers: {
                    'api-subscription-key': apiKey,
                    // axios sets multipart/form-data automatically 
                }
            }
        );

        const text = response.data?.transcript || '';
        if (text.trim()) {
            onTranscript(text.trim());
        }
    } catch (err) {
        console.error("[Voice] Sarvam STT Error:", err?.response?.data || err.message);
    }
  };

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Microphone not supported in this browser.');
      return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            setIsListening(false);
            stopWaveform();
            
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            if (audioBlob.size > 0) {
                await processAudio(audioBlob);
            }
        };

        // Fallback visualizer animation
        animRef.current = setInterval(() => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
            setWaveData([
                Math.random() * 20 + 10, 
                Math.random() * 30 + 15, 
                Math.random() * 40 + 20, 
                Math.random() * 30 + 15, 
                Math.random() * 20 + 10
            ]);
        }, 150);

        mediaRecorder.start();
        setIsListening(true);
    } catch (err) {
        console.error('[Voice] Failed to start microphone:', err);
        setIsListening(false);
    }
  }, [onTranscript, stopWaveform]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
  }, []);

  const isSupported = true; // MediaRecorder is widely supported

  return { isListening, startListening, stopListening, interim: '', waveData, isSupported };
};
