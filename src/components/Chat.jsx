import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { db, auth } from '../firebase';

const SYSTEM_PROMPT = `IDENTITY: You are AnonThera — a warm, empathetic companion for students aged 15–21 in India. You're like a caring friend who really gets it. You were built by students, for students. You are NOT a therapist.

PERSONALITY: Be conversational, friendly, and occasionally use light humor. Use natural language like a real friend would. Be encouraging and positive. Never sound robotic or formal.

CLINICAL LANGUAGE PROHIBITION: Never use: depression, disorder, diagnosis, symptoms, condition, mental illness, psychiatric.

RESPONSE STYLE: 
- Keep responses concise (2-3 sentences max)
- Use emojis occasionally to show warmth 😊
- Ask questions to keep conversation flowing
- Be encouraging and uplifting
- Use natural, conversational tone

CULTURAL CONTEXT: Academic pressure, family expectations, and exam anxiety are real struggles. Validate feelings without being preachy.

CRISIS PROTOCOL: Be warm and caring → suggest iCall gently → mention Vandrevala for night support.

VOICE MODE: When in voice mode, be even more conversational and natural, like talking to a friend.

NEVER: Be robotic, use clinical terms, promise confidentiality, say "I understand exactly how you feel" (you can say "I get it" or "that sounds tough").`

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

console.log('Google AI configured:', !!model, 'Key present:', !!import.meta.env.VITE_GEMINI_KEY);

const CRISIS_KEYWORDS = [
  'icall',
  'vandrevala',
  'helpline',
  'suicide',
  'kill myself',
  'hurt myself',
  'end it',
  'not be here anymore'
];

const makeId = () => (crypto?.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}-${Math.random()}`);

const buildPrompt = (messages, input, language) => {
  const history = messages
    .filter((msg) => !msg.meta)
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
    .join('\n');

  return `${SYSTEM_PROMPT}

User language: ${language.promptName}.
Always respond in ${language.promptName}.

Conversation so far:
${history}

User: ${input}
Assistant:`;
};

const detectCrisis = (text) => {
  const lowered = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => lowered.includes(keyword));
};

export default function Chat({
  language,
  user,
  onPeerNudge,
  onOpenHelp,
  prefillText,
  onConsumePrefill,
  isPeerActive
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [showSOS, setShowSOS] = useState(false);
  const [sosDismissed, setSosDismissed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [assistantCount, setAssistantCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false); // Only speak when voice mode is ON
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Text-to-speech function
  const speakText = (text) => {
    if (!voiceMode || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language.speech;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('Started speaking');
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      console.log('Finished speaking');
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speechSupported = useMemo(() => {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem('anonthera_disclaimer')) {
      const hour = new Date().getHours();
      let greeting = "Hello there";
      
      if (hour < 12) greeting = "Good morning! ☀️";
      else if (hour < 17) greeting = "Good afternoon! 🌤️";
      else greeting = "Good evening! 🌙";
      
      const disclaimer = {
        id: makeId(),
        role: 'assistant',
        text: `${greeting} I'm AnonThera, your anonymous companion. I'm here to listen without judgment. What's on your mind today? 😊`,
        meta: 'disclaimer'
      };
      setMessages([disclaimer]);
      sessionStorage.setItem('anonthera_disclaimer', 'true');
      
      // Only speak if voice mode is enabled
      if (voiceMode) {
        setTimeout(() => speakText(disclaimer.text), 500);
      }
    }
  }, [voiceMode]);

  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const loadMessages = async () => {
      const messagesRef = collection(db, 'chats', user.uid, 'messages');
      const messagesQuery = query(messagesRef, orderBy('ts', 'asc'), limit(100));
      const snapshot = await getDocs(messagesQuery);
      const loaded = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        role: docSnap.data().role === 'assistant' ? 'assistant' : 'user',
        text: docSnap.data().text
      }));

      setMessages((prev) => {
        const base = prev.filter((msg) => msg.meta === 'disclaimer');
        return [...base, ...loaded].slice(-100);
      });

      const assistantTotal = loaded.filter((msg) => msg.role === 'assistant').length;
      setAssistantCount(assistantTotal);
    };

    loadMessages();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (prefillText && !input) {
      setInput(prefillText);
      if (onConsumePrefill) onConsumePrefill();
    }
  }, [prefillText, input, onConsumePrefill]);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.error('Speech recognition not supported');
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }
    
    // Stop any ongoing recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = language.speech;
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsListening(true);
      console.log('Voice recognition started');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice input received:', transcript);
      setInput(transcript);
      setIsListening(false);
    };
    
    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access to use voice input.');
      } else {
        alert('Voice input failed. Please try again or type your message.');
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
      console.log('Voice recognition ended');
    };
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      setIsListening(false);
      alert('Failed to start voice input. Please try again.');
    }
  };

  const persistMessage = async (role, text) => {
    if (!user || user.isAnonymous) return;
    await addDoc(collection(db, 'chats', user.uid, 'messages'), {
      role,
      text,
      ts: serverTimestamp()
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage = { id: makeId(), role: 'user', text: input };
    const nextMessages = [...messages, userMessage].slice(-100);
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      console.log('Sending message to AI:', input);
      const prompt = buildPrompt(nextMessages, input, language);
      const result = await model.generateContent(prompt);
      const aiText = result.response.text().trim();
      console.log('AI response received:', aiText);

      const crisisDetected = detectCrisis(aiText);
      if (crisisDetected) {
        setShowSOS(true);
        setSosDismissed(false);
      }

      const nextAssistantCount = assistantCount + 1;
      const shouldNudge = !isPeerActive && nextAssistantCount % 3 === 0;

      const assistantMessage = {
        id: makeId(),
        role: 'assistant',
        text: aiText,
        nudge: shouldNudge
      };

      setAssistantCount(nextAssistantCount);
      setMessages([...nextMessages, assistantMessage].slice(-100));

      // Only speak if voice mode is enabled
      if (voiceMode) {
        speakText(aiText);
      }

      await persistMessage('user', userMessage.text);
      await persistMessage('assistant', aiText);
    } catch (error) {
      console.error('AI error:', error);
      // Fallback to demo responses on error
      setTimeout(() => {
        const demoResponses = [
          "I totally get what you're going through. That sounds really tough 😔",
          "Hey, thanks for sharing that with me. You're definitely not alone in this! 💙",
          "That takes real courage to talk about. I'm here to listen, always 🤗",
          "I can tell this is really important to you. Want to tell me more? 🤔",
          "That sounds super challenging. How are you holding up with everything? 💪"
        ];
        
        const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];
        const assistantMessage = {
          id: makeId(),
          role: 'assistant',
          text: randomResponse,
          nudge: !isPeerActive && (assistantCount + 1) % 3 === 0
        };
        
        setAssistantCount(assistantCount + 1);
        setMessages([...nextMessages, assistantMessage].slice(-100));
        
        // Only speak demo response if voice mode is enabled
        if (voiceMode) {
          speakText(randomResponse);
        }
        
        setIsSending(false);
      }, 1000);
      return;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="chat-layout">
      {showSOS && !sosDismissed && (
        <div className="sos-banner">
          <div>
            <strong>You're not alone.</strong> Tap to reach iCall.
          </div>
          <div className="sos-actions">
            <a href="tel:+919152987821">Call iCall</a>
            <a href="https://wa.me/919152987821" target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <button type="button" onClick={onOpenHelp}>
              Help tab
            </button>
            <button type="button" onClick={() => setSosDismissed(true)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Voice Mode Controls */}
      <div className="voice-controls" style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '0.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <button
          type="button"
          onClick={() => setVoiceMode(!voiceMode)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            background: voiceMode ? '#10b981' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            transition: 'all 0.2s'
          }}
        >
          {voiceMode ? '🎤 Voice ON' : '🔇 Voice OFF'}
        </button>
        {isSpeaking && (
          <button
            type="button"
            onClick={() => window.speechSynthesis.cancel()}
            style={{
              padding: '0.5rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              animation: 'pulse 1s infinite'
            }}
          >
            ⏹️
          </button>
        )}
      </div>

      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <p>{message.text}</p>
            {message.nudge && (
              <div className="peer-nudge" style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <span style={{ display: 'block', marginBottom: '0.5rem' }}>Want me to find someone who's been through something similar? 🤗</span>
                <button 
                  type="button" 
                  onClick={onPeerNudge}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'white',
                    color: '#667eea',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Find a peer
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area" style={{
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center'
      }}>
        <button
          type="button"
          onClick={startListening}
          disabled={!speechSupported || isListening}
          className="voice-button"
          style={{
            padding: '0.75rem',
            background: isListening 
              ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
              : voiceMode 
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #6b7280, #4b5563)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: speechSupported && !isListening ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            fontSize: '1.2rem',
            minWidth: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isListening ? '🔴' : '🎤'}
        </button>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={voiceMode ? "Speak or type what's on your mind... 🎤" : "Type what's on your mind... 💭"}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '1rem',
            background: 'white',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
        />
        <button 
          type="button" 
          onClick={handleSend} 
          disabled={isSending || !input.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            background: isSending || !input.trim()
              ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
              : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: isSending || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            minWidth: '80px'
          }}
        >
          {isSending ? '⏳' : 'Send'}
        </button>
      </div>
    </section>
  );
}
