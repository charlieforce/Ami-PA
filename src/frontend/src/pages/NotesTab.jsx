import React, { useState, useEffect } from 'react';
import MemoirApp from './MemoirApp';
import './NotesTab.css';
import MeetingNotesForm from './NoteForms/MeetingNotesForm';
import BrainstormForm from './NoteForms/BrainstormForm';
import QuickListForm from './NoteForms/QuickListForm';
import QuickNotesForm from './NoteForms/QuickNotesForm';
import RecentNotesDisplay from './RecentNotesDisplay';
import CalendarPage from './CalendarPage';
import { startVoiceInput } from '../services/VoiceService';
import NoteAnalysisPanel from '../components/NoteAnalysisPanel';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const NotesTab = () => {
  const [mode, setMode] = useState('My Thoughts');
  const [toast, setToast] = useState(null);
  const [activeForm, setActiveForm] = useState('recent-notes');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [dateRange, setDateRange] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clickedButtons, setClickedButtons] = useState({});
  const [showAnalysis, setShowAnalysis] = useState(null);
  const [linkedProjects, setLinkedProjects] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [justAnalysed, setJustAnalysed] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [tempInterimText, setTempInterimText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const voiceRecognitionRef = React.useRef(null);
  const voiceStartContentRef = React.useRef('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [grammarSuggestion, setGrammarSuggestion] = useState(null);
  const [expandedView, setExpandedView] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [addedTasks, setAddedTasks] = useState([]);
  const [addedTodos, setAddedTodos] = useState([]);
  const [addedReminders, setAddedReminders] = useState([]);
  const [pushingToList, setPushingToList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [filteredNotes, setFilteredNotes] = useState([])
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [draftSaved, setDraftSaved] = useState(false);
  const [speaking, setSpeaking] = useState(false);


  // Load voices on mount - prefer American female
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Find American English female voice (natural sounding)
      const americanFemale = availableVoices.findIndex(v => 
        (v.lang.includes('en-US') || v.lang.includes('en-US')) && 
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))
      );
      if (americanFemale !== -1) {
        setSelectedVoiceIndex(americanFemale);
      }
    };
    
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  // Voice input handler
  const handleVoiceInput = () => {
    if (isListening) {
      handleStopVoice();
      return;
    }
    
    setIsListening(true);
    setTempInterimText('');
    voiceStartContentRef.current = content;
    
    const result = startVoiceInput(
      (finalText) => {
        setContent(voiceStartContentRef.current + (voiceStartContentRef.current ? ' ' : '') + finalText);
        setTempInterimText('');
        setIsListening(false);
      },
      (error) => {
        console.error('Voice error:', error);
        setTempInterimText('');
        setIsListening(false);
      },
      (interimText) => {
        setTempInterimText(interimText);
      }
    );
    
    voiceRecognitionRef.current = result;
  };

  const handleStopVoice = () => {
    setIsListening(false);
    if (voiceRecognitionRef.current) {
      voiceRecognitionRef.current.stop();
    }
  };

  // Speaker/TTS handler - American female voice
  const speakText = () => {
    // If speaking, stop
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    if (!content.trim()) {
      alert('No text to read!');
      return;
    }
    
    window.speechSynthesis.cancel(); // Clear any lingering speech
    const utterance = new SpeechSynthesisUtterance(content);
    if (voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSearch = async () => {
    try {
      let url = API + '/api/notes/search?';
      if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}&`;
      if (filterType) url += `type=${encodeURIComponent(filterType)}&`;
      url += `sort=${sortBy}&order=${sortOrder}`;

      const response = await fetch(url, {
        headers: { 'X-Ami-Password': AMI_PASSWORD },
      });

      if (response.ok) {
        const data = await response.json();
        setFilteredNotes(data.notes);
      }
    } catch (err) {
      console.error('Error searching:', err);
    }
  };

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(API + '/api/notes', {
        headers: { 'X-Ami-Password': AMI_PASSWORD },
      });
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePushToTasks = async (taskTitle, noteId) => {
    setPushingToList(true);
    try {
      const response = await fetch(API + '/api/tasks/from-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({ title: taskTitle, note_id: noteId }),
      });

      if (response.ok) {
        setAddedTasks([...addedTasks, taskTitle]);
        if (noteId) {
          fetch(`${API}/api/notes/${noteId}/pushed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
            body: JSON.stringify({ kind: 'tasks', title: taskTitle })
          }).catch(() => {});
        }
      } else {
        alert('Error adding to tasks');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error adding to tasks');
    } finally {
      setPushingToList(false);
    }
  };

  const handlePushToTodos = async (todoTitle, noteId) => {
    setPushingToList(true);
    try {
      const response = await fetch(API + '/api/todos/from-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({ title: todoTitle, note_id: noteId }),
      });

      if (response.ok) {
        setAddedTodos([...addedTodos, todoTitle]);
        if (noteId) {
          fetch(`${API}/api/notes/${noteId}/pushed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
            body: JSON.stringify({ kind: 'todos', title: todoTitle })
          }).catch(() => {});
        }
      } else {
        alert('Error adding to todos');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error adding to todos');
    } finally {
      setPushingToList(false);
    }
  };

  const handlePushToReminders = async (reminderTitle, noteId) => {
    setPushingToList(true);
    try {
      const response = await fetch(API + '/api/reminders/from-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({ title: reminderTitle, note_id: noteId }),
      });

      if (response.ok) {
        setAddedReminders([...addedReminders, reminderTitle]);
        if (noteId) {
          fetch(`${API}/api/notes/${noteId}/pushed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
            body: JSON.stringify({ kind: 'reminders', title: reminderTitle })
          }).catch(() => {});
        }
      } else {
        alert('Error adding to reminders');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error adding to reminders');
    } finally {
      setPushingToList(false);
    }
  };

  const handleCopyToMyThoughts = async (quickNote) => {
    const noteContent = quickNote.content || quickNote.preview || '';
    if (!noteContent.trim()) {
      alert('Cannot copy empty note!');
      return;
    }
    try {
      const response = await fetch(API + '/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ 
          title: (quickNote.title && quickNote.title.trim()) ? quickNote.title : (quickNote.content || '').trim().split(/\s+/).slice(0, 6).join(' ') || 'Quick Note',
          content: noteContent,
          capture_type: 'My Thoughts',
          note_emoji: '💭',
          note_color: 'blue'
        }),
      });
      console.log('Response status:', response.status);
      if (response.ok) {
        alert('✅ Copied to My Thoughts!');
        fetchNotes();
      } else {
        alert('Error: ' + response.status);
      }
    } catch (err) {
      console.error('Error copying:', err);
      alert('Error: ' + err.message);
    }
  };

    const handleSaveAndAnalyze = async () => {
    if (!title.trim()) {
      alert('Give it a title first - use \u2728 Generate Title if you want one suggested.');
      return;
    }
    if (!content.trim()) {
      alert('Please write something first!');
      return;
    }

    setSaving(true);

    try {
      // STEP 1: Save the note
      const saveResponse = await fetch(API + '/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({
          title: title.trim(),
          content,
          capture_type: mode,
          linked_projects: linkedProjects,
        }),
      });

      const saveData = await saveResponse.json();

      if (saveResponse.ok) {
        // STEP 2: Analyze the note
        const analyzeResponse = await fetch(API + '/api/notes/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Ami-Password': AMI_PASSWORD,
          },
          body: JSON.stringify({
            title: title.trim(),
            content: content
          })
        });

        const analyzeData = await analyzeResponse.json();
        
        if (analyzeData.extracted) {
          setShowAnalysis(analyzeData.extracted);
          const newId = saveData.id || saveData.note_id;
          if (newId) {
            setEditingNote({ id: newId });
            setAddedTasks([]); setAddedTodos([]); setAddedReminders([]);
            fetch(`${API}/api/notes/${newId}/analysis`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
              body: JSON.stringify({ analysis: analyzeData.extracted })
            }).catch(() => {});
          }
        }

        setTitle('');
        setContent('');
        setLinkedProjects([]);
        setTimeout(() => fetchNotes(), 500);
      } else {
        alert('Error: ' + (saveData.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      const response = await fetch(`${API}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': AMI_PASSWORD },
      });

      if (response.ok) {
        setSelectedNote(null);
        fetchNotes();
      } else {
        alert('Error deleting note');
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Error deleting note');
    }
  };

  const handleEditNote = (note) => {
    setEditMode(true);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`${API}/api/notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });

      if (response.ok) {
        setEditMode(false);
        handleOpenNote(selectedNote.id);
        fetchNotes();
      } else {
        alert('Error saving edit');
      }
    } catch (err) {
      console.error('Error saving edit:', err);
      alert('Error saving edit');
    }
  };

  const updateCounts = (text) => {
    setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length);
    setCharCount(text.length);
  };

  const handleContentChange = (e, isTitleField = false) => {
    const newText = e.target.value;
    if (!isTitleField) {
      updateCounts(newText);
      setContent(newText);
      setDraftSaved(false);
      // Auto-save draft after 2 seconds
      setTimeout(() => {
        localStorage.setItem('note-draft', newText);
        setDraftSaved(true);
      }, 2000);
    } else {
      setTitle(newText);
    }
  };

  const handleGenerateTitle = async (textToUse) => {
    if (!textToUse.trim()) {
      alert('Please write something first!');
      return;
    }

    setTransforming(true);

    try {
      const response = await fetch(API + '/api/text-generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({ text: textToUse }),
      });

      const data = await response.json();

      if (response.ok) {
        setTitle(data.title);
      } else {
        alert('Error generating title');
      }
    } catch (err) {
      console.error('Error generating title:', err);
      alert('Error generating title');
    } finally {
      setTransforming(false);
    }
  };

  const handleTextTransform = async (transformType, textToTransform, toneType = null) => {
    if (!textToTransform.trim()) {
      alert('Please write something first!');
      return;
    }

    setTransforming(true);

    try {
      let endpoint = `/api/text-${transformType}`;
      if (transformType === 'tone') {
        endpoint = `/api/text-tone`;
      }
      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({ 
          text: textToTransform,
          tone: toneType
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (editMode) {
          setEditContent(data.transformed);
        } else {
          setContent(data.transformed);
          updateCounts(data.transformed);
        }
      } else {
        alert('Error transforming text');
      }
    } catch (err) {
      console.error('Error transforming:', err);
      alert('Error transforming text');
    } finally {
      setTransforming(false);
    }
  };

  const handleGrammarCheck = async (textToCheck, isTitle = false) => {
    if (!textToCheck.trim()) {
      alert('Please write something first!');
      return;
    }

    setCheckingGrammar(true);

    try {
      const response = await fetch(API + '/api/grammar-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({ text: textToCheck }),
      });

      const data = await response.json();

      if (response.ok) {
        setGrammarSuggestion(data);
        
        if (isTitle) {
          setEditTitle(data.corrected);
        } else if (editMode) {
          setEditContent(data.corrected);
        } else {
          setContent(data.corrected);
        }
      } else {
        alert('Error checking grammar');
      }
    } catch (err) {
      console.error('Error checking grammar:', err);
      alert('Error checking grammar');
    } finally {
      setCheckingGrammar(false);
    }
  };

  const handleFileUpload = async (e, noteId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API}/api/notes/${noteId}/attachments`, {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD },
        body: formData,
      });

      if (response.ok) {
        fetchAttachments(noteId);
        e.target.value = '';
      } else {
        alert('Error uploading file');
      }
    } catch (err) {
      console.error('Error uploading:', err);
      alert('Error uploading file');
    } finally {
      setUploadingFile(false);
    }
  };

  const fetchAttachments = async (noteId) => {
    try {
      const response = await fetch(`${API}/api/notes/${noteId}/attachments`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD },
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (err) {
      console.error('Error fetching attachments:', err);
    }
  };

  const handleDeleteAttachment = async (noteId, attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return;

    try {
      const response = await fetch(`${API}/api/notes/${noteId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': AMI_PASSWORD },
      });

      if (response.ok) {
        fetchAttachments(noteId);
      } else {
        alert('Error deleting attachment');
      }
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Error deleting attachment');
    }
  };

  const handleOpenNote = async (noteId) => {
    try {
      const response = await fetch(`${API}/api/notes/${noteId}`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedNote(data);
        fetchAttachments(noteId);
      } else {
        alert('Error loading note');
      }
    } catch (err) {
      console.error('Error loading note:', err);
      alert('Error loading note');
    }
  };

  {showAnalysis && (
        <div className="analysis-modal">
          <div className="analysis-content">
            <h2>✨ Analysis</h2>
            <button className="close-btn" onClick={() => setShowAnalysis(null)}>✕</button>
            
            {showAnalysis.tasks?.length > 0 && (
              <div style={{marginBottom: '20px'}}>
                <h4 style={{color: '#667eea'}}>✅ TASKS</h4>
                {showAnalysis.tasks.map((task, i) => (
                  <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#2a2a2a', marginBottom: '8px', borderRadius: '4px'}}>
                    <span style={{textDecoration: addedTasks.includes(task.title) ? 'line-through' : 'none', color: addedTasks.includes(task.title) ? '#666' : '#fff'}}>{task.title}</span>
                    <button 
                      onClick={() => {
                        handlePushToTasks(task.title, editingNote?.id);
                        setToast(`✅ Task Added: ${task.title}`);
                        setTimeout(() => setToast(null), 2000);
                      }} 
                      style={{padding: '6px 12px', background: '#667eea', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold'}}
                     disabled={addedTasks.includes(task.title)}>
                      {addedTasks.includes(task.title) ? '✓ Added' : 'Add Task'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {showAnalysis.reminders?.length > 0 && (
              <div>
                <h3>🔔 Reminders</h3>
                {showAnalysis.reminders.map((r, i) => (
                  <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#2a2a2a', marginBottom: '8px', borderRadius: '4px'}}>
                    <span style={{textDecoration: addedReminders.includes(r.title) ? 'line-through' : 'none', color: addedReminders.includes(r.title) ? '#666' : '#fff'}}>{r.title}</span>
                    <button
                      onClick={() => {
                        handlePushToReminders(r.title, editingNote?.id);
                        setToast(`✅ Reminder Added: ${r.title}`);
                        setTimeout(() => setToast(null), 2000);
                      }}
                      style={{padding: '6px 12px', background: '#f59e0b', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold'}}
                      disabled={addedReminders.includes(r.title)}>
                      {addedReminders.includes(r.title) ? '✓ Added' : 'Add Reminder'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {showAnalysis.todos?.length > 0 && (
              <div>
                <h3>📋 Todos</h3>
                {showAnalysis.todos.map((t, i) => (
                  <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#2a2a2a', marginBottom: '8px', borderRadius: '4px'}}>
                    <span style={{textDecoration: addedTodos.includes(t.title) ? 'line-through' : 'none', color: addedTodos.includes(t.title) ? '#666' : '#fff'}}>{t.title}</span>
                    <button
                      onClick={() => {
                        handlePushToTodos(t.title, editingNote?.id);
                        setToast(`✅ Todo Added: ${t.title}`);
                        setTimeout(() => setToast(null), 2000);
                      }}
                      style={{padding: '6px 12px', background: '#10b981', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold'}}
                      disabled={addedTodos.includes(t.title)}>
                      {addedTodos.includes(t.title) ? '✓ Added' : 'Add Todo'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


  return (
    <div className="notes-page">
      {/* TITLE */}
      <div className="notes-header">
        <h1>📝 NOTES & CAPTURE</h1>
        <p>Capture ideas, meetings, and brainstorms. Ami will organize them for you!</p>
      </div>

{/* FORM TABS */}
      <div className="form-tabs">
        <button className={`tab-btn ${activeForm === 'recent-notes' ? 'active' : ''}`} onClick={() => setActiveForm('recent-notes')}>🗂️ All Notes</button>
        <button className={`tab-btn ${activeForm === 'my-thoughts' ? 'active' : ''}`} onClick={() => setActiveForm('my-thoughts')}>💭 Thoughts</button>
        <button className={`tab-btn ${activeForm === 'quicklist' ? 'active' : ''}`} onClick={() => setActiveForm('quicklist')}>📌 Quick</button>
        <button className={`tab-btn ${activeForm === 'meeting' ? 'active' : ''}`} onClick={() => setActiveForm('meeting')}>🤝 Meeting</button>
        <button className={`tab-btn ${activeForm === 'brainstorm' ? 'active' : ''}`} onClick={() => setActiveForm('brainstorm')}>💡 Brainstorm</button>
        <button className={`tab-btn ${activeForm === 'memoir' ? 'active' : ''}`} onClick={() => setActiveForm('memoir')}>📖 Memoir</button>
      </div>

      {/* CALENDAR */}
      {justAnalysed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(0,0,0,0.75)', zIndex: 1000, overflowY: 'auto', padding: '16px' }}>
          <div style={{ background: '#121212', borderRadius: '12px', padding: '16px',
                        maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{justAnalysed.title}</h3>
              <button onClick={() => setJustAnalysed(null)}
                      style={{ background: 'none', border: 'none', color: '#fff',
                               fontSize: '24px', cursor: 'pointer', padding: '4px 10px' }}>×</button>
            </div>
            <NoteAnalysisPanel note={justAnalysed} />
            <button onClick={() => setJustAnalysed(null)}
                    style={{ width: '100%', padding: '14px', minHeight: '48px', marginTop: '12px',
                             background: '#2a2a2a', color: '#fff', border: 'none',
                             borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        </div>
      )}

      {activeForm === 'recent-notes' && <RecentNotesDisplay />}
      {activeForm === 'calendar' && <CalendarPage />}

      {/* MY THOUGHTS FORM */}
      {activeForm === 'my-thoughts' && (
      <div className={`capture-section ${expandedView ? 'expanded-view' : ''}`}>
        <h2>💭 {mode} Mode</h2>

        {/* TITLE INPUT */}
        <input
          type="text"
          className="title-input"
          placeholder="Give this note a title (optional)..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          spellCheck="true"
        />

        {/* CONTENT TEXTAREA */}
        <textarea style={{width: '100%', minHeight: '300px', maxHeight: '500px', overflowY: 'auto', padding: '12px', fontSize: '14px', fontFamily: 'monospace', border: '1px solid #404040', borderRadius: '6px', background: '#2a2a2a', color: '#fff'}}
          className="content-textarea"
          placeholder={`${mode}... Type or paste your ${mode.toLowerCase()}. Use mic for voice!`}
          value={content + tempInterimText}
          onChange={(e) => handleContentChange(e, false)}
          spellCheck="true"
        />

        {/* TEXT STATS */}
        <div className="text-stats">
          <span>{wordCount} words • {charCount} characters</span>
          {draftSaved && <span className="draft-saved">✓ Draft saved</span>}
        </div>

        {/* AI ACTIONS */}
        <div className="ai-actions-container">
          <div className="ai-actions">
            <button className="action-btn" onClick={() => handleTextTransform('expand', content)} disabled={transforming}>
              📝 Expand
            </button>
            <button className="action-btn" onClick={() => handleTextTransform('professional', content)} disabled={transforming}>
              💼 Professional
            </button>
            <button className="action-btn" onClick={() => handleTextTransform('simplify', content)} disabled={transforming}>
              ✏️ Simplify
            </button>
            <button className="action-btn" onClick={() => handleTextTransform('bullet-points', content)} disabled={transforming}>
              📋 Bullets
            </button>
          </div>
          <div className="ai-actions-row-2">
            <div className="tone-menu">
              <button className="action-btn" onClick={() => setShowToneMenu(!showToneMenu)}>
                💬 Tone
              </button>
              {showToneMenu && (
                <div className="tone-options">
                  <button onClick={() => { handleTextTransform('tone', content, 'casual'); setShowToneMenu(false); }} className="tone-option">
                    Casual
                  </button>
                  <button onClick={() => { handleTextTransform('tone', content, 'excited'); setShowToneMenu(false); }} className="tone-option">
                    Excited
                  </button>
                  <button onClick={() => { handleTextTransform('tone', content, 'apologetic'); setShowToneMenu(false); }} className="tone-option">
                    Apologetic
                  </button>
                </div>
              )}
            </div>
            <button className="action-btn" onClick={() => handleGenerateTitle(content)} disabled={transforming}>
              ✨ Generate Title
            </button>
            <button className="action-btn expand-toggle" onClick={() => setExpandedView(!expandedView)}>
              {expandedView ? '📦 Minimize' : '🖥️ Fullscreen'}
            </button>
          </div>
        </div>

        
        {showAnalysis && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{background: '#1a1a1a', padding: '30px', borderRadius: '8px', maxWidth: '600px', color: '#fff', maxHeight: '80vh', overflowY: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 style={{margin: 0}}>✨ Extracted Items</h3>
              <button onClick={() => setShowAnalysis(null)} style={{background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer'}}>×</button>
            </div>
            
            {showAnalysis.tasks?.length > 0 && (
              <div style={{marginBottom: '20px'}}>
                <h4 style={{color: '#667eea'}}>✅ TASKS</h4>
                {showAnalysis.tasks.map((task, i) => (
                  <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#2a2a2a', marginBottom: '8px', borderRadius: '4px'}}>
                    <span style={{textDecoration: addedTasks.includes(task.title) ? 'line-through' : 'none', color: addedTasks.includes(task.title) ? '#666' : '#fff'}}>{task.title}</span>
                    <button 
                      onClick={() => {
                        handlePushToTasks(task.title, editingNote?.id);
                        setToast(`✅ Task Added: ${task.title}`);
                        setTimeout(() => setToast(null), 2000);
                      }} 
                      style={{padding: '6px 12px', background: '#667eea', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold'}}
                     disabled={addedTasks.includes(task.title)}>
                      {addedTasks.includes(task.title) ? '✓ Added' : 'Add Task'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {showAnalysis.reminders?.length > 0 && (
              <div style={{marginBottom: '20px'}}>
                <h4 style={{color: '#f59e0b'}}>🔔 REMINDERS</h4>
                {showAnalysis.reminders.map((rem, i) => (
                  <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#2a2a2a', marginBottom: '8px', borderRadius: '4px'}}>
                    <span style={{textDecoration: addedReminders.includes(rem.title) ? 'line-through' : 'none', color: addedReminders.includes(rem.title) ? '#666' : '#fff'}}>{rem.title}</span>
                    <button 
                      onClick={() => {
                        console.log('ADDING REMINDER:', rem.title);
                        handlePushToReminders(rem.title, editingNote?.id);
                        setToast(`✅ Reminder Added: ${rem.title}`);
                        setTimeout(() => setToast(null), 2000);
                      }} 
                      style={{padding: '6px 12px', background: '#f59e0b', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold'}}
                     disabled={addedReminders.includes(rem.title)}>
                      {addedReminders.includes(rem.title) ? '✓ Added' : 'Add Reminder'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {showAnalysis.todos?.length > 0 && (
              <div>
                <h4 style={{color: '#10b981'}}>📋 TODOS</h4>
                {showAnalysis.todos.map((todo, i) => (
                  <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#2a2a2a', marginBottom: '8px', borderRadius: '4px'}}>
                    <span style={{textDecoration: addedTodos.includes(todo.title) ? 'line-through' : 'none', color: addedTodos.includes(todo.title) ? '#666' : '#fff'}}>{todo.title}</span>
                    <button 
                      onClick={() => {
                        console.log('ADDING TODO:', todo.title);
                        handlePushToTodos(todo.title, editingNote?.id);
                        setToast(`✅ Todo Added: ${todo.title}`);
                        setTimeout(() => setToast(null), 2000);
                      }} 
                      style={{padding: '6px 12px', background: '#10b981', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold'}}
                     disabled={addedTodos.includes(todo.title)}>
                      {addedTodos.includes(todo.title) ? '✓ Added' : 'Add Todo'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

        
        {toast && <div style={{position: 'fixed', bottom: '20px', right: '20px', background: '#22c55e', color: '#fff', padding: '12px 20px', borderRadius: '8px', zIndex: 1000}}>{toast}</div>}
{/* BUTTONS */}
        <div className="button-row three-buttons">
          <button className="record-btn" onClick={handleVoiceInput} style={{background: isListening ? "#ef4444" : "#10b981", color: "white", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px"}}>{isListening ? "⏹️ Stop" : "🎤 Record"}</button>
          <button className="grammar-btn" onClick={() => handleGrammarCheck(content)} disabled={checkingGrammar}>
            {checkingGrammar ? '⏳ Checking...' : '✅ Grammar & Spelling'}
          </button>
          <button onClick={speakText} style={{background: speaking ? "#667eea" : "none", border: "none", fontSize: "24px", cursor: "pointer", padding: "8px", borderRadius: "8px", transition: "all 0.2s", color: "#fff"}} title="Read aloud">
            {speaking ? '⏹️' : '🔊'}
          </button>
          <button 
            className="save-btn" 
            onClick={handleSaveAndAnalyze}
            disabled={saving}
          >
            {saving ? '⏳ Saving...' : '💾 Save & Analyze'}
          </button>
        </div>
      </div>
      )}

      {/* ANALYSIS RESULTS */}
{activeForm === 'meeting' && <MeetingNotesForm onSave={fetchNotes} onAnalysed={setJustAnalysed} />}
      {activeForm === 'brainstorm' && <BrainstormForm onSave={fetchNotes} onAnalysed={setJustAnalysed} />}
      {activeForm === 'quicklist' && <QuickNotesForm onSave={fetchNotes} />}
      {activeForm === 'memoir' && <MemoirApp />}



    </div>
  );
};

export default NotesTab;
