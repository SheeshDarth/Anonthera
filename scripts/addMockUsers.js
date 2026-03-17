import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Very basic .env parser
const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dummyUsers = [
  {
    id: 'dummy-user-1',
    anonId: 'GentleBreeze',
    language: 'en',
    isAvailable: true,
    struggles: ['Anxiety', 'Academic Pressure']
  },
  {
    id: 'dummy-user-2',
    anonId: 'QuietRiver',
    language: 'hi',
    isAvailable: true,
    struggles: ['Loneliness', 'Family Issues']
  },
  {
    id: 'dummy-user-3',
    anonId: 'NightOwl',
    language: 'en',
    isAvailable: true,
    struggles: ['Sleep Issues', 'Overthinking']
  }
];

async function seed() {
  console.log('Seeding dummy users...');
  for (const u of dummyUsers) {
    await setDoc(doc(db, 'users', u.id), {
      anonId: u.anonId,
      language: u.language,
      isAvailable: u.isAvailable,
      struggles: u.struggles,
      lastActive: serverTimestamp()
    });
    console.log(`Added user: ${u.anonId}`);
  }
  console.log('Seeding complete! You can now test Peer Matching.');
  process.exit(0);
}

seed().catch(console.error);
