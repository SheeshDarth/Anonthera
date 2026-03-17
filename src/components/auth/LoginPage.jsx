import React, { useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { auth } from '../../firebase';

export default function LoginPage({ onSignedIn }) {
  const [mode, setMode] = useState('main'); // 'main' | 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setLoading('google'); setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      onSignedIn?.();
    } catch (e) { setError(e.message); } finally { setLoading(''); }
  };

  const handleAnonymous = async () => {
    setLoading('anon'); setError('');
    try {
      await signInAnonymously(auth);
      onSignedIn?.();
    } catch (e) { setError(e.message); } finally { setLoading(''); }
  };

  const handlePhoneSubmit = async () => {
    setLoading('phone'); setError('');
    try {
      const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      const result = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmResult(result);
      setMode('otp');
    } catch (e) { setError(e.message); } finally { setLoading(''); }
  };

  const handleOTPVerify = async () => {
    setLoading('otp'); setError('');
    try {
      await confirmResult.confirm(otp);
      onSignedIn?.();
    } catch (e) { setError('Invalid OTP. Try again.'); } finally { setLoading(''); }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Hero illustration */}
      <div style={{ width: '100%', maxWidth: 360, marginBottom: 20 }}>
        <img
          src="/hero.png"
          alt="A peaceful moment of reflection"
          style={{
            width: '100%', borderRadius: 20,
            objectFit: 'cover', opacity: 0.85,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <img src="/logo.png" alt="AnonThera" style={{ width: 36, height: 36, borderRadius: 8 }} />
        <h1 style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 28, fontWeight: 800, letterSpacing: '-1px',
          color: 'var(--text-primary)', margin: 0,
        }}>AnonThera</h1>
      </div>
      <p style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif', fontStyle: 'italic',
        fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, textAlign: 'center',
      }}>A safe space. No names. No judgment.</p>

      {/* Auth Card */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bg-card)',
        border: '1px solid rgba(255,245,235,0.08)',
        borderRadius: 16, padding: '28px 24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}>
        {mode === 'main' && (
          <>
            <p style={{ fontSize: 15, fontWeight: 600, textAlign: 'center', marginBottom: 20, color: 'var(--text-primary)' }}>
              Welcome 💚
            </p>

            {/* Google */}
            <button onClick={handleGoogle} disabled={!!loading} style={{
              width: '100%', padding: '13px 16px', borderRadius: 12, marginBottom: 10,
              border: '1px solid rgba(255,245,235,0.12)', cursor: 'pointer',
              background: '#fafaf9', color: '#333', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'inherit', opacity: loading === 'google' ? 0.6 : 1,
              transition: 'opacity 0.2s, transform 0.15s',
            }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {loading === 'google' ? 'Signing in…' : 'Continue with Google'}
            </button>

            {/* Phone */}
            <button onClick={() => setMode('phone')} disabled={!!loading} style={{
              width: '100%', padding: '13px 16px', borderRadius: 12, marginBottom: 16,
              border: '1px solid rgba(255,245,235,0.1)', cursor: 'pointer',
              background: 'rgba(255,245,235,0.04)', color: 'var(--text-primary)',
              fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.2s',
            }}>
              📱 Continue with Phone
            </button>

            <div className="divider" style={{ marginBottom: 16 }}>or</div>

            {/* Anonymous */}
            <button onClick={handleAnonymous} disabled={!!loading} style={{
              width: '100%', padding: '13px 16px', borderRadius: 12,
              cursor: 'pointer', fontFamily: 'inherit',
              background: 'var(--brand-dim)', border: '1px solid var(--brand)',
              color: 'var(--brand-soft)', fontSize: 14, fontWeight: 600,
              opacity: loading === 'anon' ? 0.6 : 1,
              transition: 'opacity 0.2s, transform 0.15s',
            }}>
              {loading === 'anon' ? 'Entering…' : '🛡️ Chat Anonymously (No sign-in)'}
            </button>

            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
              Free forever · No real name stored · 100% anonymous
            </p>
          </>
        )}

        {mode === 'phone' && (
          <>
            <button onClick={() => setMode('main')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, fontFamily: 'inherit' }}>← Back</button>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Enter your phone number</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <span style={{ padding: '12px 10px', color: 'var(--text-secondary)', fontSize: 14, background: 'rgba(255,245,235,0.04)', borderRadius: 10, border: '1px solid rgba(255,245,235,0.08)' }}>+91</span>
              <input
                className="login-input"
                type="tel" placeholder="Phone number"
                value={phone} onChange={(e) => setPhone(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <button className="btn-primary" onClick={handlePhoneSubmit} disabled={phone.length < 10 || !!loading} style={{ width: '100%' }}>
              {loading === 'phone' ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </>
        )}

        {mode === 'otp' && (
          <>
            <button onClick={() => setMode('phone')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, fontFamily: 'inherit' }}>← Back</button>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Enter OTP</p>
            <input
              className="login-input"
              type="text" placeholder="6-digit code" maxLength={6}
              value={otp} onChange={(e) => setOtp(e.target.value)}
              style={{ textAlign: 'center', letterSpacing: 6, fontSize: 20, fontWeight: 700, marginBottom: 14 }}
            />
            <button className="btn-primary" onClick={handleOTPVerify} disabled={otp.length < 6 || !!loading} style={{ width: '100%' }}>
              {loading === 'otp' ? 'Verifying…' : 'Verify & Enter'}
            </button>
          </>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>{error}</p>}
      </div>

      {/* SDG badges */}
      <div style={{ marginTop: 28, display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        <span>SDG 3 🌍</span> <span>SDG 10 💛</span> <span>SDG 4 📚</span>
      </div>

      <div id="recaptcha-container" />
    </div>
  );
}
