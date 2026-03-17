import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, limit, setDoc, updateDoc, doc, serverTimestamp, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const usePeerMatch = (user, struggles, anonId) => {
  const [state, setState] = useState('lobby'); // 'lobby' | 'searching' | 'chatting'
  const [chatId, setChatId] = useState(null);
  const [peerInfo, setPeerInfo] = useState(null);
  const [peerMessages, setPeerMessages] = useState([]);
  const [unsub, setUnsub] = useState(null);

  const findPeer = useCallback(async () => {
    if (!user) return;
    setState('searching');
    try {
      // Mark self as available
      await setDoc(doc(db, 'users', user.uid), {
        anonId,
        struggles,
        isAvailable: true,
        lastActive: serverTimestamp(),
      }, { merge: true });

      await new Promise((r) => setTimeout(r, 2000)); // simulate search delay

      const q = query(
        collection(db, 'users'),
        where('isAvailable', '==', true),
        where('struggles', 'array-contains-any', struggles.length ? struggles : ['General']),
        limit(10)
      );
      const snap = await getDocs(q);
      const candidates = snap.docs.filter((d) => d.id !== user.uid);

      if (!candidates.length) {
        setState('no-match');
        await updateDoc(doc(db, 'users', user.uid), { isAvailable: false });
        setTimeout(() => setState('lobby'), 4000);
        return;
      }

      candidates.sort((a, b) => (b.data().lastActive?.seconds || 0) - (a.data().lastActive?.seconds || 0));
      const match = candidates[0];
      const ids = [user.uid, match.id].sort();
      const cId = ids.join('_');

      await setDoc(doc(db, 'peerChats', cId), {
        participants: [user.uid, match.id],
        sharedStruggle: struggles[0] || 'General',
        startedAt: serverTimestamp(),
        status: 'active',
        isReported: false,
      });

      await updateDoc(doc(db, 'users', user.uid), { isAvailable: false });
      await updateDoc(doc(db, 'users', match.id), { isAvailable: false });

      setChatId(cId);
      setPeerInfo({ anonId: match.data().anonId || 'Quiet Owl #????', sharedStruggle: struggles[0] || 'General' });

      // Subscribe to messages
      const msgRef = collection(db, 'peerChats', cId, 'messages');
      const sub = onSnapshot(query(msgRef), (s) => {
        const msgs = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.ts?.seconds || 0) - (b.ts?.seconds || 0));
        setPeerMessages(msgs);
      });
      setUnsub(() => sub);
      setState('chatting');
    } catch (e) {
      console.error('Peer match error:', e);
      setState('lobby');
    }
  }, [user, struggles, anonId]);

  const sendPeerMessage = useCallback(async (text) => {
    if (!chatId || !user) return;
    await addDoc(collection(db, 'peerChats', chatId, 'messages'), {
      senderAnonId: anonId,
      text,
      ts: serverTimestamp(),
    });
  }, [chatId, user, anonId]);

  const endChat = useCallback(async () => {
    if (unsub) unsub();
    if (chatId) await updateDoc(doc(db, 'peerChats', chatId), { status: 'ended', endedAt: serverTimestamp() });
    setState('lobby');
    setChatId(null);
    setPeerInfo(null);
    setPeerMessages([]);
  }, [chatId, unsub]);

  const reportPeer = useCallback(async (reason) => {
    if (chatId) await updateDoc(doc(db, 'peerChats', chatId), { isReported: true, reportReason: reason, status: 'reported' });
    endChat();
  }, [chatId, endChat]);

  return { state, peerInfo, peerMessages, findPeer, sendPeerMessage, endChat, reportPeer };
};
