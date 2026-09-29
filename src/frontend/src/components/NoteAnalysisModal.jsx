import React, { useState } from 'react';
import '../styles/NoteAnalysisModal.css';

function NoteAnalysisModal({ note, analysis, onCreateTasks, onSaveOnly, onCancel, amiImage }) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTasks = async () => {
    setIsCreating(true);
    await onCreateTasks();
    setIsCreating(false);
  };

  if (!note || !analysis) return null;

  return (
    <div className="modal-overlay">
      <div className="analysis-modal">
        
        {/* Header with Ami */}
        <div className="modal-header">
          <div className="ami-section">
            {amiImage && (
              <>
                <img src={amiImage} alt="Ami" className="ami-modal-avatar" />
                <div className="ami-modal-label">Angry Ami</div>
              </>
            )}
          </div>
          <h2>🔍 Analysis Complete!</h2>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>

        {/* Content - Scrollable */}
        <div className="modal-content">

          {/* Original vs Corrected */}
          <div className="analysis-section">
            <h3>📝 Original vs Corrected</h3>
            <div className="text-comparison">
              <div className="text-box original">
                <p className="label">You said:</p>
                <p className="text">{note.content}</p>
              </div>
              <div className="text-box corrected">
                <p className="label">✓ Corrected:</p>
                <p className="text">{note.content_corrected || note.content}</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {analysis.summary && (
            <div className="analysis-section">
              <h3>📊 Summary</h3>
              <p className="summary-text">{analysis.summary}</p>
            </div>
          )}

          {/* Key Points */}
          {analysis.keypoints && analysis.keypoints.length > 0 && (
            <div className="analysis-section">
              <h3>🔑 Key Points</h3>
              <ul className="keypoints-list">
                {analysis.keypoints.map((point, idx) => (
                  <li key={idx}>• {point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sentiment & Mood */}
          {(analysis.sentiment || analysis.mood) && (
            <div className="analysis-section">
              <h3>💭 Sentiment & Mood</h3>
              <div className="sentiment-cards">
                {analysis.sentiment && (
                  <div className="sentiment-card">
                    <span className="label">Sentiment:</span>
                    <span className="value">
                      {analysis.sentiment === 'positive' && '😊 Positive'}
                      {analysis.sentiment === 'neutral' && '😐 Neutral'}
                      {analysis.sentiment === 'negative' && '😟 Negative'}
                    </span>
                  </div>
                )}
                {analysis.mood && (
                  <div className="sentiment-card">
                    <span className="label">Mood:</span>
                    <span className="value">{analysis.mood}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* People Mentioned */}
          {analysis.people && analysis.people.length > 0 && (
            <div className="analysis-section">
              <h3>👤 People Mentioned</h3>
              <div className="tags-list">
                {analysis.people.map((person, idx) => (
                  <span key={idx} className="tag people-tag">@{person}</span>
                ))}
              </div>
            </div>
          )}

          {/* Projects Mentioned */}
          {analysis.projects && analysis.projects.length > 0 && (
            <div className="analysis-section">
              <h3>🏢 Projects</h3>
              <div className="tags-list">
                {analysis.projects.map((project, idx) => (
                  <span key={idx} className="tag project-tag">#{project}</span>
                ))}
              </div>
            </div>
          )}

          {/* Decisions */}
          {analysis.decisions && analysis.decisions.length > 0 && (
            <div className="analysis-section">
              <h3>🔴 Decisions Made</h3>
              <ul className="decisions-list">
                {analysis.decisions.map((decision, idx) => (
                  <li key={idx}>✓ {decision}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Items */}
          {analysis.extracted && (
            <div className="analysis-section">
              <h3>📋 What Ami Will Create</h3>
              <div className="extracted-items">
                {analysis.extracted.tasks && analysis.extracted.tasks.length > 0 && (
                  <div className="extracted-group">
                    <span className="group-icon">✅</span>
                    <div>
                      <p className="group-label">{analysis.extracted.tasks.length} Task(s)</p>
                      <ul className="items-list">
                        {analysis.extracted.tasks.map((task, idx) => (
                          <li key={idx}>• {task}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {analysis.extracted.todos && analysis.extracted.todos.length > 0 && (
                  <div className="extracted-group">
                    <span className="group-icon">📋</span>
                    <div>
                      <p className="group-label">{analysis.extracted.todos.length} TODO(s)</p>
                      <ul className="items-list">
                        {analysis.extracted.todos.map((todo, idx) => (
                          <li key={idx}>• {todo}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {analysis.extracted.actions && analysis.extracted.actions.length > 0 && (
                  <div className="extracted-group">
                    <span className="group-icon">⚡</span>
                    <div>
                      <p className="group-label">{analysis.extracted.actions.length} Action Item(s)</p>
                      <ul className="items-list">
                        {analysis.extracted.actions.map((action, idx) => (
                          <li key={idx}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className="btn-save" 
            onClick={onSaveOnly}
          >
            💾 Save Only
          </button>
          <button 
            className="btn-create" 
            onClick={handleCreateTasks}
            disabled={isCreating}
          >
            {isCreating ? '⏳ Creating...' : '✨ Create Tasks'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoteAnalysisModal;
