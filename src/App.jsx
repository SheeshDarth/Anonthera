import React, { useState, useEffect, useMemo } from 'react';
import './index.css';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getOrCreateAnonId } from './utils/anonId';
import Toast, { showToast } from './components/shared/Toast';

import LoginPage from './components/auth/LoginPage';
import Onboarding from './components/onboarding/Onboarding';
import BottomNav from './components/shared/BottomNav';
import Chat from './components/chat/Chat';
import MoodTab from './components/mood/MoodTab';
import PeerTab from './components/peer/PeerTab';
import HelpTab from './components/help/HelpTab';

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', native: 'English', promptName: 'English', speech: 'en-IN' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳', native: 'हिंदी', promptName: 'Hindi', speech: 'hi-IN' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳', native: 'தமிழ்', promptName: 'Tamil', speech: 'ta-IN' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳', native: 'తెలుగు', promptName: 'Telugu', speech: 'te-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳', native: 'ಕನ್ನಡ', promptName: 'Kannada', speech: 'kn-IN' },
];

function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0F0D15',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <img src="/logo.png" alt="" style={{ width: 52, height: 52, borderRadius: 12, animation: 'float 2.5s ease-in-out infinite', filter: 'drop-shadow(0 4px 16px rgba(139,108,193,0.4))' }} />
      <div style={{ width: 38, height: 38, border: '2.5px solid rgba(139,108,193,0.2)', borderTopColor: '#8B6CC1', borderRadius: '50%', animation: 'spin 0.85s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Outfit, sans-serif' }}>Preparing your safe space…</p>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'loggedOut' | 'loggedIn'
  const [onboardingDone, setOnboardingDone] = useState(() => Boolean(localStorage.getItem('anonthera_onboarded')));
  const [activeTab, setActiveTab] = useState('chat');
  const [anonId] = useState(getOrCreateAnonId);
  const [languageCode, setLanguageCode] = useState(() => localStorage.getItem('anonthera_lang') || 'en');
  const [struggles, setStruggles] = useState(() => JSON.parse(localStorage.getItem('anonthera_struggles') || '[]'));
  const [bridgeText, setBridgeText] = useState('');
  const [showSOSInHelp, setShowSOSInHelp] = useState(false);

  const language = useMemo(() => LANGUAGES.find((l) => l.code === languageCode) || LANGUAGES[0], [languageCode]);

  // Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setAuthState('loggedIn');
        // Sync user doc
        try {
          await setDoc(doc(db, 'users', u.uid), {
            anonId, language: languageCode, struggles,
            isAvailable: false, lastActive: serverTimestamp(),
          }, { merge: true });
        } catch {}
      } else {
        setUser(null);
        setAuthState('loggedOut');
      }
    });
    return unsub;
  }, []); // eslint-disable-line

  const handleSignedIn = () => setAuthState('loggedIn');

  const handleLanguageChange = (lang) => {
    setLanguageCode(lang.code);
    localStorage.setItem('anonthera_lang', lang.code);
    if (user) {
      try { setDoc(doc(db, 'users', user.uid), { language: lang.code }, { merge: true }); } catch {}
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('anonthera_onboarded', 'true');
    setOnboardingDone(true);
  };

  const handleStrugglesSelect = (s) => {
    setStruggles(s);
    localStorage.setItem('anonthera_struggles', JSON.stringify(s));
  };

  // Route: loading
  if (authState === 'loading') return <LoadingScreen />;

  // Route: not logged in
  if (authState === 'loggedOut') return (
    <>
      <LoginPage onSignedIn={handleSignedIn} />
      <Toast />
    </>
  );

  // Route: logged in but needs onboarding
  if (!onboardingDone) return (
    <>
      <Onboarding
        onComplete={handleOnboardingComplete}
        onLanguageSelect={handleLanguageChange}
        onStrugglesSelect={handleStrugglesSelect}
        anonId={anonId}
      />
      <Toast />
    </>
  );

  // Main App
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle ambient orbs */}
      <div style={{ position: 'fixed', top: '-8%', left: '-18%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,108,193,0.04) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orb-drift-a 14s ease-in-out infinite', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-12%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(107,165,141,0.035) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orb-drift-b 18s ease-in-out infinite', zIndex: 0 }} />

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1, height: '100dvh', overflow: 'hidden' }}>
        {activeTab === 'chat' && (
          <Chat
            language={language}
            user={user}
            anonId={anonId}
            struggles={struggles}
            onPeerNudge={() => setActiveTab('peer')}
            onOpenHelp={() => { setShowSOSInHelp(true); setActiveTab('help'); }}
            prefillText={bridgeText}
            onConsumePrefill={() => setBridgeText('')}
            onLanguageChange={handleLanguageChange}
          />
        )}
        {activeTab === 'mood' && (
          <MoodTab
            user={user}
            language={language}
            onBridgeToChat={(text) => { setBridgeText(text); setActiveTab('chat'); }}
          />
        )}
        {activeTab === 'peer' && (
          <PeerTab user={user} anonId={anonId} struggles={struggles} />
        )}
        {activeTab === 'help' && (
          <HelpTab showSOSBanner={showSOSInHelp} />
        )}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <Toast />
    </div>
  );
}
