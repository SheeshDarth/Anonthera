import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, collection, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const toIST = (date = new Date()) => {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return ist.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const useMoodData = (user) => {
  const [entries, setEntries] = useState([]);
  const [todayEntry, setTodayEntry] = useState(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = toIST();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const ref = collection(db, 'moods', user.uid, 'entries');
        const q = query(ref, orderBy('ts', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ date: d.id, ...d.data() }));
        setEntries(data);
        setTodayEntry(data.find((e) => e.date === today) || null);
        // Calculate streak
        let s = 0;
        const now = new Date(today);
        for (let i = 0; i < 365; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          if (data.find((e) => e.date === key)) s++;
          else if (i > 0) break;
        }
        setStreak(s);
      } catch (e) { console.error('Mood load error:', e); }
      setLoading(false);
    };
    load();
  }, [user, today]);

  const saveEntry = useCallback(async ({ energy, worry, gratitude }) => {
    if (!user) return;
    const entry = { energy, worry: worry || null, gratitude: gratitude || null, ts: serverTimestamp() };
    try {
      await setDoc(doc(db, 'moods', user.uid, 'entries', today), entry);
      const newEntry = { date: today, ...entry };
      setTodayEntry(newEntry);
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.date !== today);
        return [newEntry, ...filtered];
      });
      setStreak((s) => s === 0 ? 1 : s);
    } catch (e) { console.error('Mood save error:', e); }
  }, [user, today]);

  const last7 = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const entry = entries.find((e) => e.date === key);
      result.push({ date: key, energy: entry?.energy ?? null, label: d.toLocaleDateString('en-IN', { weekday: 'short' }) });
    }
    return result;
  };

  return { entries, todayEntry, streak, loading, saveEntry, last7 };
};
