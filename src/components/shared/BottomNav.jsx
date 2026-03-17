import React from 'react';

const TAB_CONFIG = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'peer', icon: '🫂', label: 'Peer' },
  { id: 'mood', icon: '📊', label: 'Mood' },
  { id: 'help', icon: '🆘', label: 'Help' },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      {TAB_CONFIG.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          aria-label={tab.label}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
