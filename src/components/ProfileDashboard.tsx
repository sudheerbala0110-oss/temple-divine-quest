import React from 'react';
import { useProfile } from '../context/profileContext';
const ACHIEVEMENTS: Record<string, any> = {
  "first-quest": { id: "first-quest", title: "First Quest", description: "Completed your first adventure", icon: "🌟" },
  "first-victory": { id: "first-victory", title: "First Victory", description: "Won your first game", icon: "🏆" },
  "high-score-hunter": { id: "high-score-hunter", title: "High Score Hunter", description: "Beat your previous high score", icon: "🎯" },
  "combo-master": { id: "combo-master", title: "Combo Master", description: "Achieved a combo streak of 10+", icon: "⚡" },
  "perfect-round": { id: "perfect-round", title: "Flawless Aim", description: "Cleared a perfect round", icon: "✨" },
  "century-score": { id: "century-score", title: "Century Scorer", description: "Scored 100 points or more", icon: "💯" },
  "game-explorer": { id: "game-explorer", title: "Temple Explorer", description: "Explored all temple challenges", icon: "🗺️" },
  "divine-champion": { id: "divine-champion", title: "Divine Champion", description: "Achieved ultimate mastery", icon: "👑" }
};

export const ProfileDashboard: React.FC = () => {
  const { profile } = useProfile();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>Player Profile</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Total XP</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#a855f7' }}>{profile?.['xp ']?? 1500}</div>
        </div>
        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Total Coins</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#eab308' }}>{profile?.['coins ']?? 500}</div>
        </div>
        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Games Completed</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#38bdf8' }}>{profile?.['completedGames ']?? 5}</div>
        </div>
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Achievements</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {Object.values(ACHIEVEMENTS).map((ach) => (
          <div
            key={ach.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155'
            }}
          >
            <span style={{ fontSize: '24px' }}>{ach.icon}</span>
            <div>
              <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{ach.title}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{ach.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileDashboard;