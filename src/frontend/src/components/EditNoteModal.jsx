import React, { useState } from 'react';
import '../styles/EditNoteModal.css';

function EditNoteModal({ note, onSave, onCancel, amiImage }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Note content cannot be empty!');
      return;
    }

    setSaving(true);
    await onSave({
      title: title || `${new Date().toLocaleDateString()} Note`,
      content: content.trim()
    });
    setSaving(false);
  };

  return (
    <div className="edit-modal-overlay" onClick={onCancel}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="edit-modal-header">
          <h2>✏️ Edit Note</h2>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>

        {/* Form */}
        <div className="edit-modal-content">
          <div className="form-group">
            <label>Title (Optional)</label>
            <input
              type="text"
              className="edit-title"
              placeholder="Give this note a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Content</label>
            <textarea
              className="edit-content"
              placeholder="Update your note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Character Count */}
          <p className="char-count">{content.length} characters</p>
        </div>

        {/* Footer */}
        <div className="edit-modal-footer">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button 
            className="btn-save" 
            onClick={handleSave}
            disabled={saving || !content.trim()}
          >
            {saving ? '⏳ Saving & Re-analyzing...' : '✨ Save & Re-analyze'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditNoteModal;
