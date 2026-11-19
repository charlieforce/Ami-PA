import { useState, useEffect, useCallback, useRef } from 'react';
import VoiceDictation, { discardSession } from '../../components/VoiceDictation';
import '../NoteFormStyles.css';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : ''));

/* 19 November: dictation moved from startVoiceInput to VoiceDictation.
 * Live text as before, plus the audio kept and an accurate transcript
 * pass; and typing during dictation is no longer discarded.  See
 * MeetingNotesForm for the full account.
 *
 * Quick Notes is the one most likely to be used one-handed walking
 * somewhere, which is exactly the case where a backgrounded tab used to
 * lose everything - so the IndexedDB chunking matters most here.
 */

export default function QuickNotesForm({ onSave }) {
  const [notes, setNotes] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [wentTo, setWentTo] = useState('');
  const [dictationStatus, setDictationStatus] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const insertedRef = useRef('');

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
        // put it where it belongs - a reminder, a task, a birthday, or
        // something she simply knows. the note is kept either way.
        try {
          const r2 = await fetch(API + '/api/notes/quick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',
                       'X-Ami-Password': AMI_PASSWORD },
            body: JSON.stringify({ text: newContent || newTitle }),
          });
          const j2 = await r2.json();
          setWentTo(j2.said || '');
        } catch (e) { setWentTo(''); }

        setNewTitle('');
        setNewContent('');
        setDictationStatus('');
        insertedRef.current = '';
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

  /* ---------------------------------------------------------- dictation */

  const onDictationComplete = useCallback(async ({ session, text: live, interim, blob }) => {
    const draft = [live, interim].filter(Boolean).join(' ').trim();

    if (draft) {
      insertedRef.current = draft;
      setNewContent(prev => (prev ? prev + ' ' : '') + draft);
    }

    if (!blob) {
      setDictationStatus(draft ? '' : 'Nothing was recorded.');
      return;
    }

    setDictationStatus(draft ? 'Tidying up the transcript…' : 'Transcribing…');

    try {
      const formData = new FormData();
      const ext = (blob.type || '').includes('mp4') ? 'm4a' : 'webm';
      formData.append('audio', blob, `quicknote.${ext}`);

      const response = await fetch(API + '/api/ami/transcribe', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD },
        body: formData,
      });

      if (!response.ok) {
        setDictationStatus(draft
          ? `Kept the live text — transcription failed (${response.status}).`
          : `Transcription failed (${response.status}).`);
        return;
      }

      const data = await response.json();
      const accurate = (data.transcript || '').trim();
      if (!accurate) {
        setDictationStatus(draft ? 'Kept the live text.' : 'Nothing was heard.');
        return;
      }

      const mine = insertedRef.current;
      setNewContent(prev =>
        (mine && prev.includes(mine))
          ? prev.replace(mine, accurate)
          : (prev ? prev + ' ' : '') + accurate
      );
      insertedRef.current = '';
      setDictationStatus('');
      discardSession(session);
    } catch (err) {
      console.error(err);
      setDictationStatus(draft
        ? 'Kept the live text — could not reach Ami.'
        : 'Could not reach Ami to transcribe that.');
    }
  }, []);

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
      {wentTo && (
        <div style={{ background: '#1d2e1d', border: '1px solid #2f5f2f',
                      borderRadius: '8px', padding: '10px 12px', marginBottom: '10px',
                      fontSize: '13px', color: '#9fd89f' }}
             onClick={() => setWentTo('')}>
          {wentTo}
        </div>
      )}
      <h2>📌 Quick Notes</h2>

      <div className="create-note-simple">
        <input
          type="text"
          placeholder="Title (optional)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="quick-title"
        />

        <div style={{ background: '#17171f', border: '1px solid #2a2a38',
                      borderRadius: '10px', padding: '10px 12px', marginBottom: '10px' }}>
          <VoiceDictation
            onComplete={onDictationComplete}
            onError={(e) => setDictationStatus(e.message)}
          />
          {dictationStatus && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9aa0b4' }}>
              {dictationStatus}
            </p>
          )}
        </div>

        <textarea
          placeholder="Your quick note..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="quick-textarea"
        />

        <div className="note-info">
          <span>{charCount} characters</span>
        </div>

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
