import React, { useEffect, useState, useRef } from 'react';

const VoiceVisualizer = ({ stream, isSpeaking, small = false }) => {
  const [waveData, setWaveData] = useState(Array(small ? 15 : 40).fill(0));
  const animRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (!stream) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setWaveData(Array(small ? 15 : 40).fill(0));
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const barCount = small ? 15 : 40;
    
    const draw = () => {
        analyser.getByteFrequencyData(dataArray);
        setWaveData(Array.from(dataArray).slice(0, barCount));
        animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [stream, small]);

  const renderBars = () => {
    const barCount = small ? 15 : 40;
    
    if (isSpeaking) {
       // Dummy animation for TTS playback
       return Array(barCount).fill(0).map((_, i) => (
           <div key={i} className="wave-bar" style={{ 
               width: small ? 3 : 6, 
               height: small ? 15 : 20 + Math.sin(i) * 10, 
               background: 'var(--brand)', 
               transition: 'height 0.2s',
               animation: `pulse 1s ease-in-out infinite alternate`,
               animationDelay: `${i * 0.05}s`
            }} 
            />
       ));
    }

    // Real audio data from mic with noise gate applied
    const maxVal = Math.max(...waveData);
    const isSilent = maxVal < 10; // Treat low background hum as silence

    return waveData.map((rawH, i) => {
      const h = isSilent ? 0 : rawH;
      return (
        <div key={i} className="wave-bar" style={{ 
          width: small ? 3 : 6, 
          height: `${Math.max(small ? 4 : 10, h * (small ? 0.2 : 0.4))}px`, 
          background: stream ? 'var(--danger)' : 'var(--brand-soft)',
          transition: 'height 0.05s ease'
        }} />
      );
    });
  };

  return (
    <div className="waveform-bars" style={{ gap: small ? 4 : 8, height: small ? 24 : 60, alignItems: 'center', display: 'flex' }}>
      {renderBars()}
    </div>
  );
};

export default React.memo(VoiceVisualizer);
