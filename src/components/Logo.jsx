import React from 'react';

const Logo = ({ size = 'medium' }) => {
  const sizeMap = {
    small: { width: '24px', height: '24px', fontSize: '1.4rem' },
    medium: { width: '32px', height: '32px', fontSize: '1.8rem' },
    large: { width: '40px', height: '40px', fontSize: '2.2rem' }
  };

  return (
    <div className="anonthera-logo" style={{ fontSize: sizeMap[size].fontSize }}>
      <div 
        className="logo-icon"
        style={{
          width: sizeMap[size].width,
          height: sizeMap[size].height,
          fontSize: sizeMap[size].fontSize * 0.6
        }}
      >
        A
      </div>
      <span>AnonThera</span>
    </div>
  );
};

export default Logo;
