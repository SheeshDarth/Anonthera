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
    hi: "Connect karne me dikkat ho rahi hai — API key abhi set nahi hui hai.",
    ta: "Inaippil sikkal — API visai innum amaikkappadavillai.",
    te: "Connect cheyadamlo samasya — API key inka set kaledu.",
    kn: "Samparkisuvalli tondare — API key innoo set agilla.",
  },
  short: {
    en: "Hey 🌱 I'm here. What's on your mind?",
    hi: "Arre 🌱 main yahan hoon. Kya chal raha hai?",
    ta: "Hey 🌱 naan inge irukkiren. Enge pesalam?",
    te: "Hey 🌱 nenu ikkada unnanu. Emi jarugutondi?",
    kn: "Hey 🌱 naanu illiddini. Eenaythu?",
  },
  crisis: {
    en: "I hear you. You're not alone in this. Can you tell me more about what's happening?",
    hi: "Main sun raha hoon. Tum akele nahi ho. Kya ho raha hai batao?",
    ta: "Naan ketkiren. Neengal thaniyaga illai. Enna nadakkirathu sollungal?",
    te: "Nenu vintunnanu. Meeru ontariga leru. Emi jarugutondo cheppagalara?",
    kn: "Naanu kelthiddini. Neevu obbare alla. Eenagtide helthira?",
  },
  general: {
    en: "I'm listening. Tell me what's going on?",
    hi: "Main sun raha hoon. Kya ho raha hai batao?",
    ta: "Naan ketkiren. Enna nadakkirathu?",
    te: "Nenu vintunnanu. Emi jarugutondi?",
    kn: "Naanu kelthiddini. Eenagtide heli?",
  },
};

const getFallback = (type, langCode) =>
  FALLBACKS[type]?.[langCode] || FALLBACKS[type]?.en;

// ── Build messages array ──────────────────────────────
const buildMessages = (userText, messageHistory, language) => {
  const langLine = `CRITICAL RULE: You must respond in the language: ${language.promptName.toUpperCase()}. \nDO NOT USE NATIVE SCRIPTS.\nONLY USE THE ENGLISH ALPHABET (A-Z).\nExample: Instead of 'नमस्ते', write 'Namaste'.\nFailure to use the English alphabet will break the system.`;

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
              content: `A student tracked mood: ${JSON.stringify(moodData)}. Write 2 warm, brief observations (under 55 words). In ${lang.promptName}. CRITICAL: Write it using the ENGLISH ALPHABET ONLY (A-Z). Do not use native scripts. Not a list. Like a caring friend.`,
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
              content: `One warm, non-cliché affirmation (under 18 words) for a student dealing with "${struggle}". In ${lang.promptName}. CRITICAL: Write it using the ENGLISH ALPHABET ONLY (A-Z). Do not use native scripts. Real and human.`,
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