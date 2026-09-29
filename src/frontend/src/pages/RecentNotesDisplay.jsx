import React, { useState, useEffect } from 'react';
import NoteAnalysisPanel from '../components/NoteAnalysisPanel';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function RecentNotesDisplay() {
  const [allNotes, setAllNotes] = useState([]);
  const [displayedNotes, setDisplayedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'view', or 'edit'
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(null);
  const [pushing, setPushing] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedReminders, setSelectedReminders] = useState([]);
  const [selectedTodos, setSelectedTodos] = useState([]);
  const [pushedItems, setPushedItems] = useState({ tasks: new Set(), reminders: new Set(), todos: new Set() });
  const [pushStatus, setPushStatus] = useState({});
  const [pushSummary, setPushSummary] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const noteTypes = ['My Thoughts', 'Brainstorm', 'Quick Notes', 'Meeting Notes'];

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    let filtered = allNotes;
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.capture_type === filterType);
    }
    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    const start = (currentPage - 1) * itemsPerPage;
    setDisplayedNotes(filtered.slice(start, start + itemsPerPage));
  }, [searchQuery, filterType, allNotes, currentPage]);

  const checkGrammar = async (text) => {
    if (!text.trim()) return;
    setCheckingGrammar(true);
    try {
      const res = await fetch(API + '/api/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.corrected) {
        setEditContent(data.corrected);
        alert('✅ Grammar fixed!');
      }
    } catch (e) {
      alert('Grammar check failed');
    } finally {
      setCheckingGrammar(false);
    }
  };

  const saveNote = async () => {
    if (!editTitle.trim() && !editContent.trim()) {
      alert('Write something!');
      return;
    }
    setSaving(true);
    try {
      await fetch(`${API}/api/notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ title: editTitle, content: editContent })
      });
      loadNotes();
      setView('view');
      alert('✅ Saved!');
    } catch (e) {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const pushToReminder = async (noteId) => {
    if (!confirm('Push this as a reminder?')) return;
    try {
      await fetch(API + '/api/reminders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({
          title: selectedNote.title || 'Reminder',
          description: selectedNote.content || '',
          source: 'from_notes',
          linked_note_id: noteId
        })
      });
      alert('✅ Pushed to Reminders!');
    } catch (e) {
      alert('❌ Failed');
    }
  };

  const pushToTodo = async (noteId) => {
    if (!confirm('Push this as a todo for today?')) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(API + '/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({
          title: selectedNote.title || 'Todo',
          description: selectedNote.content || '',
          due_date: today,
          source: 'from_notes',
          linked_note_id: noteId
        })
      });
      alert('✅ Pushed to Todos for today!');
    } catch (e) {
      alert('❌ Failed');
    }
  };

  const analyzeNote = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(API + '/api/notes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({
          title: selectedNote.title,
          content: selectedNote.content || selectedNote.preview
        })
      });
      const data = await res.json();
      console.log('📊 Full API response:', data);
      console.log('📊 Extracted:', data.extracted);
      if (data.extracted) {
        console.log('📊 Tasks:', data.extracted.tasks);
        console.log('📊 Reminders:', data.extracted.reminders);
        console.log('📊 Todos:', data.extracted.todos);
      }
      setAnalyzed(data.extracted || {});
    } catch (e) {
      console.error('Analysis error:', e);
      alert('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const pushAnalyzed = async () => {
    if (!analyzed) return;
    setPushing(true);
    try {
      let pushed = 0;
      const newStatus = {};
      
      // Push selected tasks
      for (const idx of selectedTasks) {
        if (pushedItems.tasks.has(idx)) continue; // Skip already pushed
        const task = analyzed.tasks[idx];
        try {
          const res = await fetch(API + '/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
            body: JSON.stringify({
              title: `${task.title} (from Notes)`,
              due_date: task.due_date,
              priority: task.priority || 'medium',
              source: 'from_notes',
              source_note_id: selectedNote.id,
              venture_id: 1
            })
          });
          if (res.ok) {
            pushedItems.tasks.add(idx);
            newStatus[`task-${idx}`] = '✅ Pushed';
            pushed++;
          } else {
            newStatus[`task-${idx}`] = '❌ Failed';
          }
        } catch (e) {
          newStatus[`task-${idx}`] = '❌ Failed';
        }
      }
      
      // Push selected reminders
      for (const idx of selectedReminders) {
        if (pushedItems.reminders.has(idx)) continue;
        const rem = analyzed.reminders[idx];
        try {
          const res = await fetch(API + '/api/reminders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
            body: JSON.stringify({
              title: `${rem.title} (from Notes)`,
              due_date: rem.due_date,
              due_time: rem.due_time || '09:00',
              source: 'from_notes',
              source_note_id: selectedNote.id
            })
          });
          if (res.ok) {
            pushedItems.reminders.add(idx);
            newStatus[`reminder-${idx}`] = '✅ Pushed';
            pushed++;
          } else {
            newStatus[`reminder-${idx}`] = '❌ Failed';
          }
        } catch (e) {
          newStatus[`reminder-${idx}`] = '❌ Failed';
        }
      }
      
      // Push selected todos
      for (const idx of selectedTodos) {
        if (pushedItems.todos.has(idx)) continue;
        const todo = analyzed.todos[idx];
        try {
          const res = await fetch(API + '/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
            body: JSON.stringify({
              title: `${todo.title} (from Notes)`,
              due_date: todo.due_date,
              source: 'from_notes',
              source_note_id: selectedNote.id
            })
          });
          if (res.ok) {
            pushedItems.todos.add(idx);
            newStatus[`todo-${idx}`] = '✅ Pushed';
            pushed++;
          } else {
            newStatus[`todo-${idx}`] = '❌ Failed';
          }
        } catch (e) {
          newStatus[`todo-${idx}`] = '❌ Failed';
        }
      }
      
      setPushStatus(newStatus);
      setSelectedTasks([]);
      setSelectedReminders([]);
      setSelectedTodos([]);
    } catch (e) {
      console.error('Push error:', e);
      alert('Push failed - check console');
    } finally {
      setPushing(false);
    }
  };

  const loadNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(API + '/api/notes?limit=500', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const data = await res.json();
      const notes = (data.notes || []).filter(n => !n.deleted_at);
      setAllNotes(notes);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleViewNote = async (note) => {
    // Fetch full note details
    try {
      const res = await fetch(`${API}/api/notes/${note.id}`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const fullNote = await res.json();
      setSelectedNote(fullNote);
      setEditTitle(fullNote.title || '');
      setEditContent(fullNote.content || fullNote.preview || '');
      setView('view');
    } catch (e) {
      console.error('Error fetching note:', e);
      setSelectedNote(note);
      setView('view');
    }
  };

  const handleEditNote = (note) => {
    console.log('📝 Editing note:', note);
    setSelectedNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content || '');
    setView('edit');
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Delete forever?')) return;
    try {
      await fetch(`${API}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      loadNotes();
      setView('list');
      setSelectedNote(null);
    } catch (e) {
      alert('Delete failed');
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'My Thoughts': '#667eea',
      'Brainstorm': '#f59e0b',
      'Quick Notes': '#10b981',
      'Meeting Notes': '#ef4444'
    };
    return colors[type] || '#666';
  };

  const getTypeEmoji = (type) => {
    const emojis = {
      'My Thoughts': '💭',
      'Brainstorm': '💡',
      'Quick Notes': '📌',
      'Meeting Notes': '📝'
    };
    return emojis[type] || '📄';
  };

  const totalPages = Math.ceil(
    allNotes.filter(n => 
      (filterType === 'all' || n.capture_type === filterType) &&
      (!searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    ).length / itemsPerPage
  );

  if (view === 'edit' && selectedNote) {
    console.log('📝 Edit view - title:', editTitle, 'content:', editContent);
    console.log('🔍 Current view:', view, 'selectedNote:', selectedNote?.title);
  
  return (
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        <h2>✏️ Edit: {selectedNote.title}</h2>
        <button 
          onClick={() => { setView('view'); }}
          style={{ marginBottom: '20px', padding: '12px 16px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', minHeight: '44px' }}
        >
          ← Back
        </button>
        
        <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px' }}>
          <h3>✏️ Edit Note</h3>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title..."
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '15px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #404040',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Content..."
            style={{
              width: '100%',
              minHeight: '300px',
              padding: '10px',
              marginBottom: '15px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #404040',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}
          />
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={() => checkGrammar(editContent)}
              disabled={checkingGrammar}
              style={{
                padding: '10px 14px', minHeight: '44px',
                background: checkingGrammar ? '#666' : '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {checkingGrammar ? '⏳ Checking...' : '✅ Spelling & Grammar'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={saveNote}
              disabled={saving}
              style={{
                padding: '12px 16px',
                minHeight: '44px',
                background: '#667eea',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {saving ? '⏳ Saving...' : '💾 Save'}
            </button>
            <button
              onClick={() => setView('view')}
              style={{
                padding: '10px 16px',
                background: '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'view' && selectedNote) {
    console.log('📖 DETAIL VIEW - selectedNote:', selectedNote);
    return (
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        <button 
          onClick={() => { setView('list'); setSelectedNote(null); }}
          style={{ marginBottom: '20px', padding: '12px 16px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', minHeight: '44px' }}
        >
          ← Back to Notes
        </button>
        
        <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '8px', borderLeft: `6px solid ${getTypeColor(selectedNote.capture_type)}` }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <h2 style={{ margin: 0 }}>{selectedNote.title || 'Untitled'}</h2>
              <span style={{ background: getTypeColor(selectedNote.capture_type), color: '#fff', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                {getTypeEmoji(selectedNote.capture_type)} {selectedNote.capture_type}
              </span>
            </div>
            <small style={{ color: '#999' }}>Created: {new Date(selectedNote.created_at).toLocaleString()}</small>
          </div>

          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#ccc', marginBottom: '30px', fontSize: '14px' }}>
            {selectedNote.content || selectedNote.preview}
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleEditNote(selectedNote)}
              style={{
                padding: '12px 16px',
                minHeight: '44px',
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✏️ Edit
            </button>
            {selectedNote.capture_type === 'Quick Notes' && (
              <>
                <button
                  onClick={() => pushToReminder(selectedNote.id)}
                  style={{
                    padding: '10px 16px',
                    background: '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ⏰ Reminder
                </button>
                <button
                  onClick={() => pushToTodo(selectedNote.id)}
                  style={{
                    padding: '10px 16px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ✅ Todo
                </button>
              </>
            )}

            <button
              onClick={() => handleDeleteNote(selectedNote.id)}
              style={{
                padding: '12px 16px',
                minHeight: '44px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🗑️ Delete
            </button>
          </div>

          {pushSummary && (
            <div style={{ marginTop: '30px', padding: '15px', background: '#1a2a1a', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <h5 style={{ color: '#10b981', marginTop: 0 }}>📤 Items Pushed from Notes</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '10px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>{pushSummary.tasksCount}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Tasks</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{pushSummary.remindersCount}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Reminders</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{pushSummary.todosCount}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Todos</div>
                </div>
              </div>
              <small style={{ color: '#666' }}>Pushed on: {pushSummary.timestamp}</small>
            </div>
          )}

          <NoteAnalysisPanel note={selectedNote} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>📝 Recent Notes</h2>

      {/* FILTERS */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#999', fontSize: '12px', fontWeight: 'bold' }}>Filter by Type</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                padding: '10px 14px', minHeight: '44px',
                background: filterType === 'all' ? '#667eea' : '#2a2a2a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              All Notes
            </button>
            {noteTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  padding: '10px 14px', minHeight: '44px',
                  background: filterType === type ? getTypeColor(type) : '#2a2a2a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {getTypeEmoji(type)} {type}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#2a2a2a',
            color: '#fff',
            border: '1px solid #404040',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>

      {loading && <p>Loading...</p>}

      {displayedNotes.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>No notes found</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            {displayedNotes.map(note => (
              <div
                key={note.id}
                onClick={() => handleViewNote(note)}
                style={{
                  background: '#0a0a0a',
                  border: `2px solid ${getTypeColor(note.capture_type)}`,
                  borderRadius: '8px',
                  padding: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0a0a0a'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '14px', maxWidth: '80%' }}>{note.title || 'Untitled'}</h4>
                  <span style={{ background: getTypeColor(note.capture_type), color: '#fff', padding: '4px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold' }}>
                    {getTypeEmoji(note.capture_type)}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '12px', maxHeight: '60px', overflow: 'hidden' }}>
                  {(note.content || note.preview)?.substring(0, 80)}...
                </p>
                <small style={{ color: '#666', fontSize: '11px' }}>
                  {new Date(note.created_at).toLocaleDateString()}
                </small>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  background: currentPage === 1 ? '#444' : '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ← Previous
              </button>
              <span style={{ padding: '8px 12px', color: '#fff' }}>Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  background: currentPage === totalPages ? '#444' : '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
