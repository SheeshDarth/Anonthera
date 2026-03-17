import React, { useEffect, useState } from 'react';
import { HELPLINES } from '../constants';

const phases = [
  { label: 'Inhale', seconds: 4 },
  { label: 'Hold', seconds: 7 },
  { label: 'Exhale', seconds: 8 }
];

function BreathingExercise() {
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(phases[0].seconds);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        setPhaseIndex((index) => (index + 1) % phases.length);
        return phases[(phaseIndex + 1) % phases.length].seconds;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, phaseIndex]);

  const current = phases[phaseIndex];
  const phaseClass = isRunning ? `phase-${current.label.toLowerCase()}` : '';

  return (
    <div className="breathing">
      <div className={`breathing-circle ${isRunning ? 'active' : ''} ${phaseClass}`}>
        <span>{secondsLeft}s</span>
      </div>
      <div className="breathing-info">
        <h3>{current.label}</h3>
        <p>4-7-8 breathing. Let your shoulders drop.</p>
      </div>
      <button type="button" onClick={() => setIsRunning((prev) => !prev)}>
        {isRunning ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}

export default function Help({ onOpenChat }) {
  return (
    <section className="help-layout">
      <div className="panel">
        <h2>Emergency support</h2>
        <p>If you need immediate help, these verified helplines are here for you.</p>
        <div className="helpline-grid">
          {HELPLINES.map((line) => (
            <div key={line.name} className="helpline-card">
              <div>
                <h3>{line.name}</h3>
                <p>{line.hours}</p>
                <strong>{line.display}</strong>
              </div>
              <div className="helpline-actions">
                <a href={`tel:${line.phone}`}>Call</a>
                {line.whatsapp && (
                  <a href={`https://wa.me/${line.phone.replace('+', '')}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>4-7-8 breathing</h2>
        <BreathingExercise />
      </div>

      <div className="panel">
        <h2>Need to talk?</h2>
        <p>Open the chat whenever you want. You're in control of the pace.</p>
        <button type="button" onClick={onOpenChat}>
          Go to chat
        </button>
      </div>
    </section>
  );
}
