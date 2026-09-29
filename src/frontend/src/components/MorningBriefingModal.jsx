import React, { useState, useEffect } from 'react';
import '../styles/MorningBriefingModal.css';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function MorningBriefingModal({ onClose, amiImage }) {
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBriefing();
  }, []);

  const loadBriefing = async () => {
    try {
      const res = await fetch(API + '/api/briefing/generate-morning-text', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setBriefing(json.briefing || '');
    } catch (error) {
      console.error('Error loading briefing:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <div className="modal-header">
          <img src={amiImage} alt="Ami" className="ami-image" />
          <h1>🌅 GOOD MORNING, CHARLIE!</h1>
          <p className="timestamp">Today: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="briefing-content">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>⏳ Loading your briefing...</p>
          ) : (
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'system-ui',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#333'
            }}>
              {briefing}
            </div>
          )}
        </div>

        <div className="briefing-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={onClose}>
            Ready for the day! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

export default MorningBriefingModal;
