import React, { useState, useEffect } from 'react';
import { 
  createNote, 
  correctNote, 
  analyzeNote, 
  processBrainstorm,
  extractLists,
  getNote,
  getAllNotes,
  deleteNote
} from '../utils/api';
import '../styles/NotesPage.css';
import NoteAnalysisModal from './NoteAnalysisModal';
import NoteViewModal from './NoteViewModal';

function NotesPage({ amiImage }) {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState('thoughts'); // thoughts, meeting, brainstorm, list
  const [isRecording, setIsRecording] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await getAllNotes();
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setProcessing(true);
    try {
      const result = await createNote({
        title: title || `${mode} note`,
        content,
        mode
      });

      setCurrentNote(result.id);
      
      // Auto-correct
      const corrections = await correctNote(result.id);
      
      // Analyze
      const analysis = await analyzeNote(result.id);
      
      // Process based on mode
      if (mode === 'brainstorm') {
        await processBrainstorm(result.id);
      } else if (mode === 'list') {
        await extractLists(result.id);
      }

      // Show analysis modal
      setCurrentAnalysis({
        ...analysis.analysis,
        note_id: result.id,
        original_content: content,
        corrected_content: corrections.corrected
      });
      setShowAnalysisModal(true);
      
      // Reset form
      setContent('');
      setTitle('');

    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setProcessing(false);
    }
  };

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

  const handleCreateTasks = async () => {
    // TODO: Create tasks from analysis
    alert('Tasks will be created here! 🎯');
    setShowAnalysisModal(false);
    loadNotes();
  };

  const handleSaveOnly = () => {
    setShowAnalysisModal(false);
    loadNotes();
  };

  if (loading) {
    return <div className="notes-loading">Loading your notes...</div>;
  }

  return (
    <div className="notes-page">
      <div className="notes-header">
        <h2>📝 NOTES & CAPTURE</h2>
        <p>Capture ideas, meetings, and brainstorms. Ami will organize them for you!</p>
      </div>

      {/* Mode Selector */}
      <div className="mode-selector">
        {['thoughts', 'meeting', 'brainstorm', 'list'].map(m => (
          <button
            key={m}
            className={`mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => setMode(m)}
          >
            {getModeIcon(m)} {getModeLabel(m)}
          </button>
        ))}
      </div>

      {/* Capture Section */}
      <div className="capture-section">
        <div className="capture-header">
          {getModeIcon(mode)} {getModeLabel(mode)} Mode
        </div>

        <form onSubmit={handleSaveNote} className="capture-form">
          {/* Title (optional) */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this note a title (optional)..."
            className="note-title-input"
          />

          {/* Content textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`${getModeLabel(mode)}... Type or paste your ${mode}. Use mic for voice!`}
            className="note-content-input"
            rows="6"
          />

          {/* Action Buttons */}
          <div className="capture-actions">
            <button type="button" className="mic-btn">
              🎤 Record Voice
            </button>
            <button 
              type="submit" 
              disabled={!content.trim() || processing}
              className="save-btn"
            >
              {processing ? '⏳ Processing...' : '💾 Save & Analyze'}
            </button>
          </div>
        </form>

        {/* Ami Guidance */}
        {content.trim() && (
          <div className="ami-preview">
            {amiImage && (
              <>
                <img src={amiImage} alt="Ami" className="ami-avatar" />
                <div className="ami-label">Angry Ami</div>
              </>
            )}
            <p className="ami-guidance">
              {mode === 'meeting' && "I'll extract key decisions, action items, and create tasks for you! 🎯"}
              {mode === 'brainstorm' && "I'll break this into phases, estimate timeline, and create tasks! 💡"}
              {mode === 'thoughts' && "I'll organize these thoughts and suggest what to do! 💭"}
              {mode === 'list' && "I'll detect shopping lists and TODOs automatically! 📋"}
            </p>
          </div>
        )}
      </div>

      {/* Recent Notes */}
      <div className="notes-section">
        <div className="section-header">
          <h3>📚 Recent Notes</h3>
          <span className="count">{notes.length}</span>
        </div>

        {notes.length === 0 ? (
          <p className="empty-state">No notes yet. Start capturing! 📝</p>
        ) : (
          <div className="notes-grid">
            {notes.map(note => (
              <div key={note.id} className="note-card-mobile">
                <div className="note-card-header-mobile">
                  <div className="note-header-left">
                    <span className="note-mode-icon">{getModeIcon(note.mode)}</span>
                    <div>
                      <p className="note-title-mobile">{note.title || `${getModeLabel(note.mode)}`}</p>
                      <p className="note-time-mobile">
                        {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="note-summary-mobile">
                  "{note.ai_summary ? note.ai_summary.substring(0, 80) : note.content.substring(0, 80)}..."
                </p>

                <div className="note-meta-mobile">
                  {note.ai_mood && <span className="meta-badge mood">{getMoodEmoji(note.ai_mood)}</span>}
                  {note.extracted_people && JSON.parse(note.extracted_people || '[]').length > 0 && (
                    <span className="meta-badge people">👤 {JSON.parse(note.extracted_people)[0]}</span>
                  )}
                  {note.extracted_projects && JSON.parse(note.extracted_projects || '[]').length > 0 && (
                    <span className="meta-badge project">#{JSON.parse(note.extracted_projects)[0]}</span>
                  )}
                  <span className={`meta-badge status ${note.status}`}>
                    {note.status === 'draft' && '✏️'}
                    {note.status === 'reviewed' && '👀'}
                    {note.status === 'processed' && '✅'}
                    {note.status === 'archived' && '📦'}
                  </span>
                </div>

                <div className="note-actions-mobile">
                  <button 
                    className="action-btn-mobile view" 
                    onClick={async () => {
                      const noteData = await getNote(note.id);
                      setViewingNote(noteData.note);
                      setShowViewModal(true);
                    }}
                    title="View"
                  >
                    👁️
                  </button>
                  <button 
                    className="action-btn-mobile process" 
                    onClick={async () => {
                      const noteData = await getNote(note.id);
                      const analysis = await analyzeNote(note.id);
                      setCurrentAnalysis({
                        ...analysis.analysis,
                        note_id: note.id,
                        original_content: noteData.note.content,
                        corrected_content: noteData.note.content_corrected
                      });
                      setShowAnalysisModal(true);
                    }}
                    title="Process"
                  >
                    ⚡
                  </button>
                  <button 
                    className="action-btn-mobile archive" 
                    onClick={() => deleteNote(note.id)}
                    title="Archive"
                  >
                    📦
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ami Encouragement */}
      <div className="notes-encouragement">
        {amiImage && (
          <>
            <img src={amiImage} alt="Ami" className="ami-small" />
            <div className="ami-label">Angry Ami</div>
          </>
        )}
        <p>Keep capturing! Every note brings you closer to your goals! 🚀</p>
      </div>

      {/* Analysis Modal */}
      {showAnalysisModal && (
        <NoteAnalysisModal
          note={{ content: currentAnalysis?.original_content }}
          analysis={currentAnalysis}
          onCreateTasks={handleCreateTasks}
          onSaveOnly={handleSaveOnly}
          onCancel={() => setShowAnalysisModal(false)}
          amiImage={amiImage}
        />
      )}

      {/* View Modal */}
      {showViewModal && viewingNote && (
        <NoteViewModal
          note={viewingNote}
          analysis={viewingNote}
          onProcess={async () => {
            const analysis = await analyzeNote(viewingNote.id);
            setCurrentAnalysis({
              ...analysis.analysis,
              note_id: viewingNote.id,
              original_content: viewingNote.content,
              corrected_content: viewingNote.content_corrected
            });
            setShowViewModal(false);
            setShowAnalysisModal(true);
          }}
          onArchive={async () => {
            await deleteNote(viewingNote.id);
            setShowViewModal(false);
            await loadNotes();
          }}
          onClose={() => setShowViewModal(false)}
          amiImage={amiImage}
        />
      )}
    </div>
  );
}

export default NotesPage;
