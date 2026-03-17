import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

// Map our app's language codes to Sarvam's expected codes
// Sarvam supports: hi-IN, bn-IN, kn-IN, ml-IN, mr-IN, od-IN, pa-IN, ta-IN, te-IN, en-IN, gu-IN
const SARVAM_LANG_MAP = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
};

// Strip ALL emojis so TTS doesn't read them
const stripEmojis = (text) =>
  text.replace(/[\u{1F600}-\u{1F9FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{1FA00}-\u{1FAFF}\u{2702}-\u{27B0}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const speak = useCallback(async (text, languageCode, onFinish) => {
    if (!text) return;
    
    // Stop any currently playing audio
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }

    const cleanText = stripEmojis(text);
    if (!cleanText) return;

    setIsSpeaking(true);

    try {
      const apiKey = import.meta.env.VITE_SARVAM_API_KEY;
      if (!apiKey) {
        console.warn("[TTS] Missing VITE_SARVAM_API_KEY");
        setIsSpeaking(false);
        if (onFinish) onFinish();
        return;
      }

      const response = await axios.post(
        'https://api.sarvam.ai/text-to-speech',
        {
          inputs: [cleanText],
          target_language_code: SARVAM_LANG_MAP[languageCode] || 'hi-IN',
          speaker: 'meera', // Female voice, sounds warm
          pitch: 0,
          pace: 1.05, // slightly faster for natural feel
          loudness: 1.5,
          speech_sample_rate: 24000,
          enable_preprocessing: true,
          model: 'bulbul:v1'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': apiKey
          }
        }
      );

      const base64Audio = response.data?.audios?.[0];
      if (!base64Audio) {
          throw new Error("No audio returned from Sarvam");
      }

      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      audioRef.current = audio;

      audio.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
          if (onFinish) onFinish();
      };
      
      audio.onerror = (e) => {
          console.error("[TTS] Audio playback error", e);
          setIsSpeaking(false);
          if (onFinish) onFinish();
      };

      await audio.play();

    } catch (error) {
      console.error('[TTS] Sarvam TTS Error:', error?.response?.data || error.message);
      setIsSpeaking(false);
      if (onFinish) onFinish();
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const isSupported = true; // API-based, so always supported if online

  return { speak, stop, isSpeaking, isSupported };
};
