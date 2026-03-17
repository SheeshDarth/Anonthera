import React, { useState } from 'react';
import { LANGUAGES, STRUGGLE_TAGS } from '../constants';

export default function Onboarding({
  languageCode,
  onLanguageChange,
  struggles,
  onStrugglesChange,
  isAnonymous,
  onComplete
}) {
  const [step, setStep] = useState(0);

  const toggleStruggle = (tag) => {
    if (struggles.includes(tag)) {
      onStrugglesChange(struggles.filter((item) => item !== tag));
    } else {
      onStrugglesChange([...struggles, tag]);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Add keyboard support
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        if (step === 1) {
          handleNext();
        }
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {step === 0 && (
          <>
            <h2>AnonThera</h2>
            <p>A safe space. No names. No judgment.</p>
            <button type="button" onClick={handleNext} style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}>
              Start
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Choose your language</h2>
            <p>You can switch anytime from the header.</p>
            <div className="lang-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.5rem',
              margin: '1rem 0'
            }}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={languageCode === lang.code ? 'tag active' : 'tag'}
                  onClick={() => onLanguageChange(lang.code)}
                  style={{
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: languageCode === lang.code ? '#3b82f6' : 'white',
                    color: languageCode === lang.code ? 'white' : '#0f172a',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <div className="onboarding-actions" style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '1.5rem'
            }}>
              <button 
                type="button" 
                onClick={handleNext}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Continue
              </button>
              <button 
                type="button" 
                className="ghost-button" 
                onClick={handleSkip}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Skip for now
              </button>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
              Tip: Press Enter to continue
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h2>What are you dealing with?</h2>
            <p>Pick at least one. This improves peer matching.</p>
            {isAnonymous && (
              <p className="hint">Tags are saved locally until you choose "Save your journey".</p>
            )}
            <div className="tag-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '0.5rem',
              margin: '1rem 0'
            }}>
              {STRUGGLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={struggles.includes(tag) ? 'tag active' : 'tag'}
                  onClick={() => toggleStruggle(tag)}
                  style={{
                    padding: '0.75rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: struggles.includes(tag) ? '#3b82f6' : 'white',
                    color: struggles.includes(tag) ? 'white' : '#0f172a',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
            <button 
              type="button" 
              onClick={handleNext} 
              disabled={struggles.length === 0}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: struggles.length > 0 ? '#3b82f6' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: struggles.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                marginTop: '1rem'
              }}
            >
              Continue
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Quick safety note</h2>
            <p>
              I'm here to listen, but I'm not a therapist. If you're in immediate danger, tap Help
              any time to reach verified helplines.
            </p>
            <button 
              type="button" 
              onClick={handleNext}
              style={{
                padding: '1rem 2rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                marginTop: '1rem'
              }}
            >
              Enter AnonThera
            </button>
          </>
        )}
      </div>
    </div>
  );
}
