import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Debug: log first 12 chars of each key to verify .env is loaded
if (import.meta.env.DEV) {
  console.log('[Firebase] Loaded config:', {
    apiKey:    firebaseConfig.apiKey?.slice(0, 12) + '…',
    projectId: firebaseConfig.projectId,
    hasGroq: !!import.meta.env.VITE_GROQ_KEY,
    groqKey: import.meta.env.VITE_GROQ_KEY?.slice(0, 14) + '…',
  });
}

const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const auth = getAuth(app);
