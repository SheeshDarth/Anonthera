import React, { useEffect, useState } from 'react';

let _showToast = null;
export const showToast = (msg, duration = 2500) => { if (_showToast) _showToast(msg, duration); };

export default function Toast() {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    _showToast = (msg, duration) => {
      setMessage(msg);
      setTimeout(() => setMessage(null), duration);
    };
    return () => { _showToast = null; };
  }, []);

  if (!message) return null;
  return <div className="toast">{message}</div>;
}
