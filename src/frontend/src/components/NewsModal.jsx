import React from 'react';

export default function NewsModal({ item, onClose }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#1a1a1a', borderRadius: '12px', maxWidth: '700px', width: '100%', maxHeight: '85vh', overflow: 'auto', border: '2px solid #667eea', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' }}>
          <h2 style={{ margin: 0, color: '#667eea', fontSize: '14px', fontWeight: 'bold' }}>📰 {item.section}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: '28px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '24px', flex: 1 }}>
          <h3 style={{ color: '#667eea', fontSize: '15px', margin: '0 0 20px 0', fontWeight: 'bold' }}>
            {item.headline}
          </h3>
          <p style={{ color: '#d0d0d0', fontSize: '13px', lineHeight: '1.9', whiteSpace: 'pre-wrap', margin: 0 }}>
            {item.body}
          </p>
        </div>
      </div>
    </div>
  );
}
