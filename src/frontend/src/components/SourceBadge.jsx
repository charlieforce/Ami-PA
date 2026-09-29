import React from 'react';

export default function SourceBadge({ source, createdAt }) {
  const sources = {
    'from_notes': { icon: '📝', label: 'From My Thoughts', color: '#10B981', bg: '#ECFDF5' },
    'from_meeting': { icon: '🤝', label: 'From Meeting', color: '#3B82F6', bg: '#EFF6FF' },
    'from_brainstorm': { icon: '💭', label: 'From Brainstorm', color: '#A855F7', bg: '#FAF5FF' },
    'from_memoir': { icon: '📖', label: 'From Memoir', color: '#F59E0B', bg: '#FFFBEB' },
    'from_ami': { icon: '💬', label: 'From Ami Chat', color: '#EF4444', bg: '#FEF2F2' },
    'from_tasks': { icon: '✅', label: 'From Tasks', color: '#06B6D4', bg: '#ECFDF5' },
    'manual': { icon: '📌', label: 'Manual', color: '#6B7280', bg: '#F9FAFB' }
  };

  const sourceInfo = sources[source] || sources['manual'];
  
  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      backgroundColor: sourceInfo.bg,
      borderLeft: `3px solid ${sourceInfo.color}`,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      color: sourceInfo.color
    }}>
      <span style={{ fontSize: '14px' }}>{sourceInfo.icon}</span>
      <span>{sourceInfo.label}</span>
      {dateStr && <span style={{ color: '#999', marginLeft: 'auto' }}>{dateStr}</span>}
    </div>
  );
}
