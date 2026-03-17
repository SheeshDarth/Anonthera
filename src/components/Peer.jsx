import React, { useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { STRUGGLE_TAGS } from '../constants';
import LoadingSpinner from './LoadingSpinner';

const makeChatId = (uidA, uidB) => {
  return [uidA, uidB].sort().join('_');
};

const CHAT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_MESSAGE_LENGTH = 500;
const INAPPROPRIATE_KEYWORDS = [
  'suicide', 'kill', 'harm', 'die', 'death', 'murder',
  'violence', 'abuse', 'illegal', 'drugs', 'self-harm'
];

const containsInappropriateContent = (text) => {
  const lowerText = text.toLowerCase();
  return INAPPROPRIATE_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

const sanitizeMessage = (text) => {
  return text.trim().slice(0, MAX_MESSAGE_LENGTH);
};

export default function Peer({ user, anonId, struggles, onStrugglesChange, onPeerActiveChange }) {
  const [isAvailable, setIsAvailable] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [matchStatus, setMatchStatus] = useState('');
  const [chatId, setChatId] = useState(null);
  const [peerAnonId, setPeerAnonId] = useState('');
  const [sharedStruggle, setSharedStruggle] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isReported, setIsReported] = useState(false);
  const [chatStartTime, setChatStartTime] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');
  const messagesEndRef = useRef(null);
  const chatTimeoutRef = useRef(null);

  useEffect(() => {
    onPeerActiveChange(Boolean(chatId));
  }, [chatId, onPeerActiveChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;

    const chatDocRef = doc(db, 'peerChats', chatId);
    const messagesRef = collection(chatDocRef, 'messages');

    const unsubscribeDoc = onSnapshot(chatDocRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      setIsReported(Boolean(data.isReported));
      if (data.status === 'ended') {
        setChatId(null);
        setChatStartTime(null);
        if (chatTimeoutRef.current) {
          clearTimeout(chatTimeoutRef.current);
        }
      }
    });

    const unsubscribeMsgs = onSnapshot(
      query(messagesRef, orderBy('ts', 'asc')),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setMessages(items);
      }
    );

    return () => {
      unsubscribeDoc();
      unsubscribeMsgs();
    };
  }, [chatId]);

  useEffect(() => {
    if (chatStartTime && !isReported) {
      chatTimeoutRef.current = setTimeout(() => {
        handleLeave();
        setMatchStatus('Chat session ended after 30 minutes for safety.');
      }, CHAT_TIMEOUT_MS);
    }

    return () => {
      if (chatTimeoutRef.current) {
        clearTimeout(chatTimeoutRef.current);
      }
    };
  }, [chatStartTime, isReported]);

  const toggleStruggle = (tag) => {
    if (struggles.includes(tag)) {
      onStrugglesChange(struggles.filter((item) => item !== tag));
    } else {
      onStrugglesChange([...struggles, tag]);
    }
  };

  const handleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    if (user && !user.isAnonymous) {
      await updateDoc(doc(db, 'users', user.uid), {
        isAvailable: next,
        lastActive: serverTimestamp()
      });
    }
  };

  const handleFindPeer = async () => {
    if (!user || user.isAnonymous) return;
    if (struggles.length === 0) return;

    setLoadingMatch(true);
    setMatchStatus('');
    setWarningMessage('');

    try {
      const usersRef = collection(db, 'users');
      const matchQuery = query(
        usersRef,
        where('isAvailable', '==', true),
        where('struggles', 'array-contains-any', struggles),
        limit(10)
      );

      const snapshot = await getDocs(matchQuery);
      const candidates = snapshot.docs
        .map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }))
        .filter((candidate) => candidate.uid !== user.uid)
        .filter((candidate) => {
          const timeSinceLastActive = Date.now() - (candidate.lastActive?.toMillis?.() || 0);
          return timeSinceLastActive < 24 * 60 * 60 * 1000; // Active in last 24 hours
        });

      if (candidates.length === 0) {
        setLoadingMatch(false);
        setMatchStatus('No peer available right now. Try again in a few minutes.');
        return;
      }

      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const shared = struggles.find((tag) => pick.struggles?.includes(tag)) || struggles[0];
      const newChatId = makeChatId(user.uid, pick.uid);

      const chatRef = doc(db, 'peerChats', newChatId);

      await runTransaction(db, async (transaction) => {
        const chatSnap = await transaction.get(chatRef);
        if (!chatSnap.exists()) {
          transaction.set(chatRef, {
            participants: [user.uid, pick.uid],
            sharedStruggle: shared,
            isReported: false,
            status: 'active',
            startedAt: serverTimestamp(),
            safetyChecks: {
              autoEndAt: new Date(Date.now() + CHAT_TIMEOUT_MS)
            }
          });
        }
      });

      setChatId(newChatId);
      setPeerAnonId(pick.anonId || 'Peer');
      setSharedStruggle(shared);
      setChatStartTime(Date.now());

      await updateDoc(doc(db, 'users', user.uid), {
        isAvailable: false,
        lastActive: serverTimestamp()
      });

      setIsAvailable(false);
      setLoadingMatch(false);
      setMatchStatus('');
      setWarningMessage('Chat will automatically end after 30 minutes for safety.');
      
      setTimeout(() => setWarningMessage(''), 10000);
    } catch (error) {
      console.error('Error finding peer:', error);
      setLoadingMatch(false);
      setMatchStatus('Something went wrong. Please try again.');
    }
  };

  const handleSend = async () => {
    if (!chatId || !input.trim() || isReported) return;

    const sanitizedText = sanitizeMessage(input);
    
    if (containsInappropriateContent(sanitizedText)) {
      setWarningMessage('Please keep the conversation supportive and safe.');
      setTimeout(() => setWarningMessage(''), 5000);
      return;
    }

    try {
      const chatRef = doc(db, 'peerChats', chatId);
      await addDoc(collection(chatRef, 'messages'), {
        senderAnonId: anonId,
        text: sanitizedText,
        ts: serverTimestamp(),
        moderated: false
      });
      setInput('');
      setWarningMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setWarningMessage('Failed to send message. Please try again.');
      setTimeout(() => setWarningMessage(''), 3000);
    }
  };

  const handleReport = async () => {
    if (!chatId) return;
    
    try {
      await updateDoc(doc(db, 'peerChats', chatId), {
        isReported: true,
        reportedAt: serverTimestamp(),
        status: 'under_review'
      });
      setWarningMessage('Chat has been reported and is under review.');
    } catch (error) {
      console.error('Error reporting chat:', error);
      setWarningMessage('Failed to report chat. Please try again.');
      setTimeout(() => setWarningMessage(''), 3000);
    }
  };

  const handleLeave = async () => {
    if (!chatId) return;
    
    try {
      await updateDoc(doc(db, 'peerChats', chatId), {
        status: 'ended',
        endedAt: serverTimestamp(),
        endedBy: user.uid
      });

      if (user && !user.isAnonymous) {
        await updateDoc(doc(db, 'users', user.uid), {
          isAvailable: true,
          lastActive: serverTimestamp()
        });
      }

      setChatId(null);
      setMessages([]);
      setIsAvailable(true);
      setChatStartTime(null);
      setWarningMessage('');
      
      if (chatTimeoutRef.current) {
        clearTimeout(chatTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error leaving chat:', error);
      setWarningMessage('Error leaving chat. Please try again.');
      setTimeout(() => setWarningMessage(''), 3000);
    }
  };

  if (!user || user.isAnonymous) {
    return (
      <section className="panel">
        <h2>Peer matching</h2>
        <p>Peer matching unlocks when you choose "Save your journey" with Google sign-in.</p>
        <p>Your chats remain anonymous. Real names are never shown.</p>
      </section>
    );
  }

  return (
    <section className="peer-layout">
      <div className="panel">
        <h2>Struggle tags</h2>
        <p>Pick what you're dealing with so we can match you with someone who gets it.</p>
        <div className="tag-grid">
          {STRUGGLE_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={struggles.includes(tag) ? 'tag active' : 'tag'}
              onClick={() => toggleStruggle(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="availability-row">
          <label>
            <input type="checkbox" checked={isAvailable} onChange={handleAvailability} />
            Available for peer chat
          </label>
        </div>
        <button type="button" onClick={handleFindPeer} disabled={!isAvailable || loadingMatch}>
          {loadingMatch ? <LoadingSpinner size="small" message="Finding someone..." /> : 'Find a peer'}
        </button>
        {struggles.length === 0 && <p className="hint">Select at least one tag to match.</p>}
        {matchStatus && <p className="hint">{matchStatus}</p>}
        {warningMessage && <p className="warning">{warningMessage}</p>}
      </div>

      {chatId && (
        <div className="panel chat-panel">
          <div className="chat-header">
            <div>
              <h3>Chatting with {peerAnonId}</h3>
              <span className="hint">Also dealing with {sharedStruggle}</span>
              {chatStartTime && (
                <span className="hint">
                  Session ends in {Math.max(0, Math.ceil((CHAT_TIMEOUT_MS - (Date.now() - chatStartTime)) / 60000))} minutes
                </span>
              )}
            </div>
            <div className="chat-actions">
              <button type="button" className="ghost-button" onClick={handleReport}>
                Report
              </button>
              <button type="button" onClick={handleLeave}>
                Leave chat
              </button>
            </div>
          </div>

          <div className="messages peer-messages">
            {warningMessage && (
              <div className="warning-banner">{warningMessage}</div>
            )}
            {isReported && (
              <div className="report-banner">Chat paused — our team will review.</div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.senderAnonId === anonId ? 'user' : 'assistant'}`}>
                <p>{msg.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={isReported ? 'Chat paused' : 'Type your message...'}
              disabled={isReported}
              maxLength={MAX_MESSAGE_LENGTH}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />
            <button type="button" onClick={handleSend} disabled={isReported || !input.trim()}>
              Send
            </button>
            {input.length > MAX_MESSAGE_LENGTH * 0.8 && (
              <span className="character-count">
                {input.length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
