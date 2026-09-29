import { useState, useEffect, useRef } from 'react';
import { startVoiceInput } from '../../services/VoiceService';
import '../NoteFormStyles.css';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function QuickNotesForm({ onSave }) {
  const [notes, setNotes] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [tempInterimText, setTempInterimText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const voiceRecognitionRef = useRef(null);
  const voiceStartContentRef = useRef('');

  useEffect(() => {
    fetchQuickNotes();
  }, []);

  const fetchQuickNotes = async () => {
    try {
      const response = await fetch(API + '/api/notes?type=Quick Notes');
      if (response.ok) {
        const data = await response.json();
        setNotes(data.filter(n => !n.deleted_at));
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  };

  const createNote = async () => {
    if (!newContent.trim()) {
      alert('Write something first!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API + '/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({
          title: (newTitle && newTitle.trim())
            ? newTitle.trim()
            : ((newContent || '').trim().split(/\s+/).slice(0, 7).join(' ').slice(0, 60) || 'Quick Note'),
          content: newContent,
          capture_type: 'Quick Notes',
          is_pinned: 1,
        }),
      });

      if (response.ok) {
        setNewTitle('');
        setNewContent('');
        fetchQuickNotes();
        onSave?.();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async (noteId, updates) => {
    try {
      await fetch(`${API}/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify(updates),
      });
      fetchQuickNotes();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied! 📋');
  };

  const charCount = newContent.length;


  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      const americanFemale = availableVoices.findIndex(v => (v.lang.includes('en-US')) && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman')));
      if (americanFemale !== -1) setSelectedVoiceIndex(americanFemale);
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const handleVoiceInput = () => {
    if (isListening) { handleStopVoice(); return; }
    setIsListening(true);
    setTempInterimText('');
    voiceStartContentRef.current = newContent;
    const result = startVoiceInput((finalText) => {
      setNewContent(voiceStartContentRef.current + (voiceStartContentRef.current ? ' ' : '') + finalText);
      setTempInterimText('');
      setIsListening(false);
    }, (error) => {
      console.error('Voice error:', error);
      setTempInterimText('');
      setIsListening(false);
    }, (interimText) => {
      setTempInterimText(interimText);
    });
    voiceRecognitionRef.current = result;
  };

  const handleStopVoice = () => {
    setIsListening(false);
    if (voiceRecognitionRef.current) voiceRecognitionRef.current.stop();
  };

  const speakText = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!newContent.trim()) { alert('No text to read!'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(newContent);
    if (voices[selectedVoiceIndex]) utterance.voice = voices[selectedVoiceIndex];
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="quick-notes-container">
      <h2>📌 Quick Notes</h2>
      
      <div className="create-note-simple">
        <input
          type="text"
          placeholder="Title (optional)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="quick-title"
        />
        
        <textarea
          placeholder="Your quick note..."
          value={newContent + tempInterimText}
          onChange={(e) => setNewContent(e.target.value)}
          className="quick-textarea"
        />

        <div className="note-info">
          <span>{charCount} characters</span>
        </div>

        <button onClick={handleVoiceInput} style={{ padding: '10px 14px', background: isListening ? '#ef4444' : '#667eea', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{isListening ? '⏹️ STOP' : '🎤'}</button>
        <button onClick={speakText} style={{ padding: '10px 14px', background: speaking ? '#667eea' : '#10b981', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>{speaking ? '⏹️' : '🔊'}</button>
        <button onClick={createNote} disabled={loading} className="create-btn">
          {loading ? '⏳' : '💾'} Save Note
        </button>
      </div>

      {notes.length > 0 && (
        <div className="notes-section">
          <h3>✨ Your Notes</h3>
          <div className="simple-notes-grid">
            {notes.map(note => (
              <div key={note.id} className="simple-note">
                <h4>{note.title}</h4>
                <p>{note.content}</p>
                <div className="note-actions">
                  <button onClick={() => copyToClipboard(note.content)}>📋 Copy</button>
                  <button onClick={() => updateNote(note.id, { is_pinned: note.is_pinned ? 0 : 1 })}>
                    {note.is_pinned ? '📍' : '📌'} {note.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button onClick={() => updateNote(note.id, { deleted_at: new Date().toISOString() })}>🗑️ Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
