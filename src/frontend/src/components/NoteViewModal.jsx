import React, { useState } from 'react';
import '../styles/NoteViewModal.css';
import EditNoteModal from './EditNoteModal';
import { updateNote, getNote } from '../utils/api';

function NoteViewModal({ note, analysis, onProcess, onArchive, onClose, amiImage }) {
  const [showEditModal, setShowEditModal] = useState(false);
  if (!note) return null;

  const getModeIcon = (mode) => {
    const icons = {
      'thoughts': '💭',
      'meeting': '🎤',
      'brainstorm': '💡',
      'list': '📋'
    };
    return icons[mode] || '📝';
  };

  const getModeLabel = (mode) => {
    const labels = {
      'thoughts': 'My Thoughts',
      'meeting': 'Meeting Notes',
      'brainstorm': 'Brainstorm',
      'list': 'Quick List'
    };
    return labels[mode] || mode;
  };

  const getMoodEmoji = (mood) => {
    const emojis = {
      'energized': '⚡',
      'frustrated': '😤',
      'focused': '🎯',
      'creative': '💡',
      'calm': '😌',
      'excited': '🤩'
    };
    return emojis[mood?.toLowerCase()] || '🎭';
  };

  const handleEditSave = async (updatedData) => {
    try {
      const result = await updateNote(note.id, {
        title: updatedData.title,
        content: updatedData.content
      });
      
      // Reload the updated note
      const updated = await getNote(note.id);
      
      // Show success message
      alert('Note updated and re-analyzed! 🔄');
      
      // Close edit modal
      setShowEditModal(false);
      
      // Refresh parent (close view modal to reload list)
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      const errorMsg = error.error || error.message || JSON.stringify(error);
      alert('Error updating note: ' + errorMsg);
    }
  };

  return (
    <div className="view-modal-overlay" onClick={onClose}>
      <div className="view-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="view-modal-header">
          <div className="header-left">
            <span className="mode-icon">{getModeIcon(note.mode)}</span>
            <div>
              <h2>{note.title || getModeLabel(note.mode)}</h2>
              <p className="date-time">
                {new Date(note.created_at).toLocaleDateString()} 
                {' • '} 
                {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Content - Scrollable */}
        <div className="view-modal-content">

          {/* Full Note Content */}
          <div className="content-section">
            <h3>📝 Full Note</h3>
            <div className="note-text">
              <p>{note.content}</p>
              {note.content_corrected && note.content !== note.content_corrected && (
                <div className="corrected-note">
                  <p className="label">✓ Corrected version:</p>
                  <p>{note.content_corrected}</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {note.ai_summary && (
            <div className="content-section">
              <h3>📊 Summary</h3>
              <p className="summary">{note.ai_summary}</p>
            </div>
          )}

          {/* Key Points */}
          {analysis && analysis.keypoints && analysis.keypoints.length > 0 && (
            <div className="content-section">
              <h3>🔑 Key Points</h3>
              <ul className="keypoints">
                {analysis.keypoints.map((point, idx) => (
                  <li key={idx}>• {point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          <div className="content-section">
            <h3>📋 Metadata</h3>
            <div className="metadata-grid">
              {note.ai_mood && (
                <div className="metadata-item">
                  <span className="emoji">{getMoodEmoji(note.ai_mood)}</span>
                  <span className="label">Mood:</span>
                  <span className="value">{note.ai_mood}</span>
                </div>
              )}
              {note.ai_sentiment && (
                <div className="metadata-item">
                  <span className="emoji">
                    {note.ai_sentiment === 'positive' ? '😊' : note.ai_sentiment === 'negative' ? '😟' : '😐'}
                  </span>
                  <span className="label">Sentiment:</span>
                  <span className="value">{note.ai_sentiment}</span>
                </div>
              )}
            </div>
          </div>

          {/* People */}
          {note.extracted_people && JSON.parse(note.extracted_people || '[]').length > 0 && (
            <div className="content-section">
              <h3>👤 People Mentioned</h3>
              <div className="tags">
                {JSON.parse(note.extracted_people).map((person, idx) => (
                  <span key={idx} className="tag people-tag">@{person}</span>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {note.extracted_projects && JSON.parse(note.extracted_projects || '[]').length > 0 && (
            <div className="content-section">
              <h3>🏢 Projects</h3>
              <div className="tags">
                {JSON.parse(note.extracted_projects).map((project, idx) => (
                  <span key={idx} className="tag project-tag">#{project}</span>
                ))}
              </div>
            </div>
          )}

          {/* Decisions */}
          {note.extracted_decisions && JSON.parse(note.extracted_decisions || '[]').length > 0 && (
            <div className="content-section">
              <h3>🔴 Decisions</h3>
              <ul className="decisions">
                {JSON.parse(note.extracted_decisions).map((decision, idx) => (
                  <li key={idx}>✓ {decision}</li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="view-modal-footer">
          <button className="btn-secondary" onClick={() => setShowEditModal(true)}>✏️ Edit</button>
          <button className="btn-secondary archive" onClick={onArchive}>📦 Archive</button>
          <button className="btn-primary" onClick={onProcess}>⚡ Process & Create Tasks</button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditNoteModal
          note={note}
          onSave={handleEditSave}
          onCancel={() => setShowEditModal(false)}
          amiImage={amiImage}
        />
      )}
    </div>
  );
}

export default NoteViewModal;
