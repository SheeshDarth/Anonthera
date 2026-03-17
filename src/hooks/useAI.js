import Groq from 'groq-sdk';
import { SYSTEM_PROMPT } from '../prompts/systemPrompt';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useState, useCallback } from 'react';

// ── Singleton ──────────────────────────────────────────
const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;
if (import.meta.env.DEV) {
  console.log('[useAI] Groq key present:', !!GROQ_KEY);
}
const groq = GROQ_KEY
  ? new Groq({ apiKey: GROQ_KEY, dangerouslyAllowBrowser: true })
  : null;

// ── Model ─────────────────────────────────────────────
const MODEL = 'llama-3.1-8b-instant'; // fast, free, multilingual

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

const getFallback = (type, langCode) =>
  FALLBACKS[type]?.[langCode] || FALLBACKS[type]?.en;

// ── Build messages array ──────────────────────────────
const buildMessages = (userText, messageHistory, language) => {
  const langLine = `RESPOND ONLY IN ${language.promptName.toUpperCase()}. Not a single word in any other language.`;

  const history = messageHistory
    .filter((m) => !m.meta && m.text && m.text.length > 0)
    .slice(-16)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

  return [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n${langLine}`,
    },
    ...history,
    {
      role: 'user',
      content: userText,
    },
  ];
};

export const useAI = (language, user) => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (userText, messageHistory = []) => {
      setIsLoading(true);
      const lc = language.code;

      if (!groq) {
        setIsLoading(false);
        return getFallback('noKey', lc);
      }

      try {
        const messages = buildMessages(userText, messageHistory, language);

        if (import.meta.env.DEV) {
          console.log('[useAI] Sending. Lang:', language.promptName, '| User:', userText);
        }

        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages,
          max_tokens: 250,
          temperature: 0.82,
          top_p: 0.94,
          stop: ['\nUser:', '\nStudent:', '\nAnonThera:'],
        });

        let aiText = completion.choices[0]?.message?.content?.trim();

        if (!aiText || aiText.length < 3) throw new Error('Empty response');

        // Strip any leaked role prefix
        aiText = aiText.replace(/^AnonThera:\s*/i, '').trim();
        aiText = aiText.split(/\n(User|Student|AnonThera):/)[0].trim();

        if (import.meta.env.DEV) console.log('[useAI] Response:', aiText);

        // Persist for signed-in users
        if (user && !user.isAnonymous) {
          const ref = collection(db, 'chats', user.uid, 'messages');
          await addDoc(ref, { role: 'user', text: userText, ts: serverTimestamp() });
          await addDoc(ref, { role: 'assistant', text: aiText, ts: serverTimestamp() });
        }

        return aiText;
      } catch (err) {
        console.error('[useAI] API Error:', err);

        if (import.meta.env.DEV) {
          return `[DEV ERROR] ${err.message || String(err)}`;
        }

        const t = userText.toLowerCase();
        if (t.length <= 4) return getFallback('short', lc);
        if (
          t.includes('suicide') ||
          t.includes('self harm') ||
          t.includes('end my life')
        )
          return getFallback('crisis', lc);
        return getFallback('general', lc);
      } finally {
        setIsLoading(false);
      }
    },
    [language, user]
  );

  const generateWeeklyInsight = useCallback(
    async (moodData, lang) => {
      if (!groq) return "You showed up this week — that matters. 🌱";
      try {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: `A student tracked mood: ${JSON.stringify(moodData)}. Write 2 warm, brief observations (under 55 words). In ${lang}. Not a list. Like a caring friend.`,
            },
          ],
          max_tokens: 120,
          temperature: 0.75,
        });
        return completion.choices[0]?.message?.content?.trim() ||
          "You showed up this week — that matters. 🌱";
      } catch {
        return "You showed up for yourself this week — that matters. 🌱";
      }
    },
    []
  );

  const generateAffirmation = useCallback(
    async (struggle, lang) => {
      if (!groq) return "You are doing better than you think. 🌱";
      try {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: `One warm, non-cliché affirmation (under 18 words) for a student dealing with "${struggle}". In ${lang}. Real and human.`,
            },
          ],
          max_tokens: 60,
          temperature: 0.85,
        });
        const text = completion.choices[0]?.message?.content?.trim() || '';
        return text.replace(/^["']|["']$/g, '') || "You are doing better than you think. 🌱";
      } catch {
        return "You are doing better than you think. 🌱";
      }
    },
    []
  );

  return { sendMessage, generateWeeklyInsight, generateAffirmation, isLoading };
};