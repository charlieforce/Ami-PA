import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const RecentNotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayedCount, setDisplayedCount] = useState(10);
  const [selectedNote, setSelectedNote] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || API + '';
  const PASSWORD = AMI_PASSWORD;

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notes`, {
        headers: { 'X-Ami-Password': PASSWORD }
      });
      const data = await res.json();
      setNotes(data.notes || []);
      setLoading(false);
    } catch (e) {
      console.error('Error loading notes:', e);
      setLoading(false);
    }
  };

  const getEmojiForType = (captureType) => {
    const emojis = {
      meeting: '💼',
      brainstorm: '🧠',
      decision: '🎯',
      memory: '📸',
      thought: '💭',
      todo: '✓',
      idea: '💡',
      learning: '📚',
      general: '📝'
    };
    return emojis[captureType] || '📝';
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      Positive: '#10b981',
      Negative: '#ef4444',
      Neutral: '#f59e0b',
      Mixed: '#667eea'
    };
    return colors[sentiment] || '#f59e0b';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Urgent: '#ef4444',
      High: '#f59e0b',
      Medium: '#667eea',
      Routine: '#10b981'
    };
    return colors[priority] || '#667eea';
  };

  const openNote = (note) => {
    setSelectedNote(note);
  };

  const closeNote = () => {
    setSelectedNote(null);
  };

  const displayedNotes = notes.slice(0, displayedCount);
  const hasMore = displayedCount < notes.length;

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading notes...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginBottom: '10px', fontSize: '32px', fontWeight: 'bold' }}>📝 Recent Notes</h1>
      <p style={{ color: '#aaa', marginBottom: '30px', fontSize: '14px' }}>Last {Math.min(displayedCount, notes.length)} of {notes.length} notes</p>

      {displayedNotes.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: '40px' }}>
          No notes yet! Start capturing your thoughts! 💭
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '30px' }}>
          {displayedNotes.map(note => (
            <div
              key={note.id}
              onClick={() => openNote(note)}
              style={{
                padding: '16px',
                background: '#2a2a2a',
                borderRadius: '12px',
                cursor: 'pointer',
                border: '2px solid #444',
                transition: 'all 0.3s ease',
                transform: 'translateY(0)',
                hover: { transform: 'translateY(-4px)', borderColor: '#667eea' }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#444';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', marginBottom: '12px' }}>
                <span style={{ fontSize: '32px', marginRight: '12px' }}>
                  {getEmojiForType(note.capture_type)}
                </span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', wordBreak: 'break-word' }}>
                    {note.title || 'Untitled'}
                  </h3>
                  <p style={{ color: '#aaa', margin: 0, fontSize: '12px' }}>
                    {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </p>
                </div>
              </div>

              <p style={{ color: '#ccc', fontSize: '13px', marginBottom: '12px', lineHeight: '1.4', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {note.preview}
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {note.sentiment && (
                  <span style={{ fontSize: '11px', background: getSentimentColor(note.sentiment) + '20', color: getSentimentColor(note.sentiment), padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    {note.sentiment}
                  </span>
                )}
                {note.priority && (
                  <span style={{ fontSize: '11px', background: getPriorityColor(note.priority) + '20', color: getPriorityColor(note.priority), padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    {note.priority}
                  </span>
                )}
                {note.capture_type && (
                  <span style={{ fontSize: '11px', background: '#667eea20', color: '#667eea', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    {note.capture_type}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setDisplayedCount(displayedCount + 10)}
          style={{
            width: '100%',
            padding: '12px',
            background: '#667eea',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '15px'
          }}
        >
          Load More ({notes.length - displayedCount} remaining)
        </button>
      )}

      {/* DETAIL MODAL */}
      {selectedNote && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '30px',
            border: '2px solid #444'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px' }}>{getEmojiForType(selectedNote.capture_type)}</span>
                  {selectedNote.title || 'Untitled'}
                </h2>
                <p style={{ color: '#aaa', margin: 0, fontSize: '13px' }}>
                  {new Date(selectedNote.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={closeNote}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '28px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px', padding: '16px', background: '#2a2a2a', borderRadius: '8px' }}>
              <p style={{ color: '#fff', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedNote.preview}
              </p>
            </div>

            {selectedNote.summary && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#667eea', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Summary</h3>
                <p style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5' }}>
                  {typeof selectedNote.summary === 'string' ? selectedNote.summary : JSON.stringify(selectedNote.summary).substring(0, 200)}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {selectedNote.sentiment && (
                <span style={{ fontSize: '12px', background: getSentimentColor(selectedNote.sentiment) + '20', color: getSentimentColor(selectedNote.sentiment), padding: '6px 12px', borderRadius: '6px', fontWeight: '600' }}>
                  {selectedNote.sentiment}
                </span>
              )}
              {selectedNote.priority && (
                <span style={{ fontSize: '12px', background: getPriorityColor(selectedNote.priority) + '20', color: getPriorityColor(selectedNote.priority), padding: '6px 12px', borderRadius: '6px', fontWeight: '600' }}>
                  {selectedNote.priority}
                </span>
              )}
              {selectedNote.capture_type && (
                <span style={{ fontSize: '12px', background: '#667eea20', color: '#667eea', padding: '6px 12px', borderRadius: '6px', fontWeight: '600' }}>
                  {selectedNote.capture_type}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentNotesPage;
