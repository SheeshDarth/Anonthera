import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../firebase';
import LoadingSpinner from './LoadingSpinner';

const STORAGE_KEY = 'anonthera_moods';

const getLocalDateKey = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const emojiForEnergy = (value) => {
  switch (value) {
    case 1:
      return '😴';
    case 2:
      return '😔';
    case 3:
      return '😐';
    case 4:
      return '🙂';
    case 5:
      return '⚡';
    default:
      return '😐';
  }
};

const loadLocalEntries = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Error loading local entries:', error);
    return {};
  }
};

const saveLocalEntries = (entries) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving local entries:', error);
  }
};

const exportMoodData = (entries) => {
  const dataStr = JSON.stringify(entries, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `anonthera-mood-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function Mood({ user, onWorryToChat }) {
  const [energy, setEnergy] = useState(3);
  const [worry, setWorry] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [gratitudePage, setGratitudePage] = useState(1);
  const [editing, setEditing] = useState(false);

  const todayKey = useMemo(() => getLocalDateKey(), []);
  const todayEntry = entries[todayKey];

  useEffect(() => {
    const loadEntries = async () => {
      if (!user || user.isAnonymous) {
        const localEntries = loadLocalEntries();
        setEntries(localEntries);
        setLoading(false);
        return;
      }

      const entryQuery = query(
        collection(db, 'moods', user.uid, 'entries'),
        orderBy('ts', 'desc')
      );
      const snapshot = await getDocs(entryQuery);
      const loaded = {};
      snapshot.forEach((docSnap) => {
        loaded[docSnap.id] = docSnap.data();
      });
      setEntries(loaded);
      setLoading(false);
    };

    loadEntries();
  }, [user]);

  useEffect(() => {
    if (!todayEntry) return;
    setEnergy(todayEntry.energy ?? 3);
    setWorry(todayEntry.worry ?? '');
    setGratitude(todayEntry.gratitude ?? '');
    setEditing(false);
  }, [todayEntry]);

  const handleSave = async () => {
    try {
      const payload = {
        energy,
        worry: worry.trim(),
        gratitude: gratitude.trim(),
        ts: serverTimestamp(),
        lastModified: Date.now()
      };

      const updated = {
        ...entries,
        [todayKey]: payload
      };

      setEntries(updated);
      setGratitudePage(1);
      setEditing(false);

      if (!user || user.isAnonymous) {
        saveLocalEntries(updated);
        return;
      }

      await setDoc(doc(db, 'moods', user.uid, 'entries', todayKey), payload);
    } catch (error) {
      console.error('Error saving mood entry:', error);
      alert('Failed to save your entry. Please try again.');
    }
  };

  const handleDelete = async () => {
    try {
      const updated = { ...entries };
      delete updated[todayKey];
      
      setEntries(updated);
      setEnergy(3);
      setWorry('');
      setGratitude('');
      setEditing(false);

      if (!user || user.isAnonymous) {
        saveLocalEntries(updated);
        return;
      }

      await deleteDoc(doc(db, 'moods', user.uid, 'entries', todayKey));
    } catch (error) {
      console.error('Error deleting mood entry:', error);
      alert('Failed to delete your entry. Please try again.');
    }
  };

  const last7Days = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const key = new Date(day.getTime() - day.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      const entry = entries[key];
      result.push({
        date: key.slice(5),
        energy: entry?.energy ?? null
      });
    }
    return result;
  }, [entries]);

  const gratitudeEntries = useMemo(() => {
    return Object.entries(entries)
      .filter(([, value]) => value.gratitude)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, value]) => ({ date, text: value.gratitude }));
  }, [entries]);

  const pagedGratitude = gratitudeEntries.slice(0, gratitudePage * 10);

  if (loading) {
    return (
      <section className="panel">
        <LoadingSpinner message="Loading your mood space..." />
      </section>
    );
  }

  return (
    <section className="mood-layout">
      <div className="panel">
        <h2>Daily check-in</h2>
        <p>One check-in per day. Keep it light, keep it honest.</p>

        {todayEntry && !editing ? (
          <div className="mood-summary">
            <p>
              <strong>Energy:</strong> {emojiForEnergy(todayEntry.energy)} ({todayEntry.energy}/5)
            </p>
            {todayEntry.worry && (
              <p>
                <strong>Worry:</strong> {todayEntry.worry}
              </p>
            )}
            {todayEntry.gratitude && (
              <p>
                <strong>Gratitude:</strong> {todayEntry.gratitude}
              </p>
            )}
            <div className="mood-actions">
              <button type="button" onClick={() => setEditing(true)}>
                Edit today's check-in
              </button>
              <button type="button" className="ghost-button" onClick={handleDelete}>
                Delete entry
              </button>
              {todayEntry.worry && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onWorryToChat(todayEntry.worry)}
                >
                  Talk through this worry
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="energy-row">
              <label htmlFor="energy">Energy today</label>
              <div className="energy-display">
                <span className="energy-emoji">{emojiForEnergy(energy)}</span>
                <input
                  id="energy"
                  type="range"
                  min="1"
                  max="5"
                  value={energy}
                  onChange={(event) => setEnergy(Number(event.target.value))}
                />
              </div>
            </div>

            <label htmlFor="worry">What are you worrying about? (optional)</label>
            <textarea
              id="worry"
              rows="3"
              value={worry}
              onChange={(event) => setWorry(event.target.value)}
            />

            <label htmlFor="gratitude">One small gratitude? (optional)</label>
            <textarea
              id="gratitude"
              rows="2"
              value={gratitude}
              onChange={(event) => setGratitude(event.target.value)}
            />

            <div className="mood-actions">
              <button type="button" onClick={handleSave}>
                Save check-in
              </button>
              {worry.trim() && (
                <button type="button" className="ghost-button" onClick={() => onWorryToChat(worry)}>
                  Talk through this worry
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h2>7-day energy trend</h2>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={last7Days}>
              <XAxis dataKey="date" />
              <YAxis domain={[1, 5]} tickFormatter={(value) => emojiForEnergy(value)} />
              <Tooltip formatter={(value) => `${value} / 5`} />
              <Line type="monotone" dataKey="energy" stroke="#0f766e" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Gratitude log</h2>
          {gratitudeEntries.length > 0 && (
            <button 
              type="button" 
              className="ghost-button" 
              onClick={() => exportMoodData(entries)}
              style={{ fontSize: '0.8rem' }}
            >
              Export Data
            </button>
          )}
        </div>
        {pagedGratitude.length === 0 ? (
          <p>No entries yet. Add one when you're ready.</p>
        ) : (
          <ul className="gratitude-log">
            {pagedGratitude.map((entry) => (
              <li key={entry.date}>
                <strong>{entry.date}</strong>
                <span>{entry.text}</span>
              </li>
            ))}
          </ul>
        )}
        {pagedGratitude.length < gratitudeEntries.length && (
          <button type="button" className="ghost-button" onClick={() => setGratitudePage((p) => p + 1)}>
            See older
          </button>
        )}
      </div>
    </section>
  );
}
