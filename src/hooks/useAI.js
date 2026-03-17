import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT } from '../prompts/systemPrompt';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useState, useCallback } from 'react';

// ── Singleton ──────────────────────────────────────────
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
if (import.meta.env.DEV) {
  console.log('[useAI] key present:', !!GEMINI_KEY);
}
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

// ── Translated fallback responses ─────────────────────
const FALLBACKS = {
  noKey: {
    en: "I'm having trouble connecting — the API key isn't set up yet.",
    hi: "कनेक्ट करने में दिक्कत हो रही है — API key अभी सेट नहीं हुई है।",
    ta: "இணைப்பில் சிக்கல் — API விசை இன்னும் அமைக்கப்படவில்லை.",
    te: "కనెక్ట్ చేయడంలో సమస్య — API కీ ఇంకా సెట్ కాలేదు.",
    kn: "ಸಂಪರ್ಕಿಸುವಲ್ಲಿ ತೊಂದರೆ — API ಕೀ ಇನ್ನೂ ಸೆಟ್ ಆಗಿಲ್ಲ.",
  },
  short: {
    en: "Hey 🌱 I'm here. What's on your mind?",
    hi: "अरे 🌱 मैं यहाँ हूँ। क्या चल रहा है?",
    ta: "ஹேய் 🌱 நான் இங்கே இருக்கிறேன். எங்கே பேசலாம்?",
    te: "హేయ్ 🌱 నేను ఇక్కడ ఉన్నాను. ఏం జరుగుతోంది?",
    kn: "ಹೇ 🌱 ನಾನು ಇಲ್ಲಿದ್ದೀನಿ. ಏನಾಯ್ತು?",
  },
  crisis: {
    en: "I hear you. You're not alone in this. Can you tell me more about what's happening?",
    hi: "मैं सुन रहा हूँ। तुम अकेले नहीं हो। क्या हो रहा है बताओ?",
    ta: "நான் கேட்கிறேன். நீங்கள் தனியாக இல்லை. என்ன நடக்கிறது சொல்லுங்கள்?",
    te: "నేను వింటున్నాను. మీరు ఒంటరిగా లేరు. ఏం జరుగుతోందో చెప్పగలరా?",
    kn: "ನಾನು ಕೇಳ್ತಿದ್ದೇನೆ. ನೀವು ಒಬ್ಬರೇ ಅಲ್ಲ. ಏನಾಗ್ತಿದೆ ಹೇಳ್ತೀರಾ?",
  },
  general: {
    en: "I'm listening. Tell me what's going on?",
    hi: "मैं सुन रहा हूँ। क्या हो रहा है बताओ?",
    ta: "நான் கேட்கிறேன். என்ன நடக்கிறது?",
    te: "నేను వింటున్నాను. ఏం జరుగుతోంది?",
    kn: "ನಾನು ಕೇಳ್ತಿದ್ದೇನೆ. ಏನಾಗ್ತಿದೆ ಹೇಳಿ?",
  },
};

const getFallback = (type, langCode) => FALLBACKS[type]?.[langCode] || FALLBACKS[type]?.en;

// ── Build prompt ──────────────────────────────────────
const buildPrompt = (userText, messageHistory, language) => {
  const langLine = `RESPOND ONLY IN ${language.promptName.toUpperCase()}. Not a single word in any other language.`;

  const history = messageHistory
    .filter((m) => !m.meta && m.text && m.text.length > 0)
    .slice(-16)
    .map((m) => (m.role === 'user' ? `User: ${m.text}` : `AnonThera: ${m.text}`))
    .join('\n');

  return `${SYSTEM_PROMPT}

${langLine}

${history.length > 0 ? `CONVERSATION:\n${history}\n` : ''}
User: ${userText}
AnonThera:`;
};

export const useAI = (language, user) => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (userText, messageHistory = []) => {
    setIsLoading(true);
    const lc = language.code;

    if (!genAI) {
      setIsLoading(false);
      return getFallback('noKey', lc);
    }

    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.82,
          topP: 0.94,
          maxOutputTokens: 250,
          stopSequences: ['\nUser:', '\nStudent:', '\nAnonThera:'],
        },
      });

      const prompt = buildPrompt(userText, messageHistory, language);

      if (import.meta.env.DEV) {
        console.log('[useAI] Sending. Lang:', language.promptName, '| User:', userText);
      }

      const result = await model.generateContent(prompt);
      let aiText = result.response.text().trim();
      aiText = aiText.replace(/^AnonThera:\s*/i, '').trim();
      aiText = aiText.split(/\n(User|Student|AnonThera):/)[0].trim();

      if (!aiText || aiText.length < 3) throw new Error('Empty response');

      if (import.meta.env.DEV) console.log('[useAI] Response:', aiText);

      // Persist for signed-in users
      if (user && !user.isAnonymous) {
        const ref = collection(db, 'chats', user.uid, 'messages');
        await addDoc(ref, { role: 'user', text: userText, ts: serverTimestamp() });
        await addDoc(ref, { role: 'assistant', text: aiText, ts: serverTimestamp() });
      }

      return aiText;
    } catch (err) {
      console.error('[useAI] error:', err.message);
      const t = userText.toLowerCase();
      if (t.length <= 4) return getFallback('short', lc);
      if (t.includes('suicide') || t.includes('self harm') || t.includes('end my life'))
        return getFallback('crisis', lc);
      return getFallback('general', lc);
    } finally {
      setIsLoading(false);
    }
  }, [language, user]);

  const generateWeeklyInsight = useCallback(async (moodData, lang) => {
    if (!genAI) return "You showed up this week — that matters. 🌱";
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `A student tracked mood: ${JSON.stringify(moodData)}. Write 2 warm, brief observations (under 55 words). In ${lang}. Not a list. Like a caring friend.`;
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch {
      return "You showed up for yourself this week — that matters. 🌱";
    }
  }, []);

  const generateAffirmation = useCallback(async (struggle, lang) => {
    if (!genAI) return "You are doing better than you think. 🌱";
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `One warm, non-cliché affirmation (under 18 words) for a student dealing with "${struggle}". In ${lang}. Real and human.`;
      const result = await model.generateContent(prompt);
      return result.response.text().trim().replace(/^["']|["']$/g, '');
    } catch {
      return "You are doing better than you think. 🌱";
    }
  }, []);

  return { sendMessage, generateWeeklyInsight, generateAffirmation, isLoading };
};
