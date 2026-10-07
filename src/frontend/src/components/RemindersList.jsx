import React, { useState, useEffect } from 'react';
import { startVoiceInput, parseVoiceInput, speakReminder } from '../services/VoiceService';
import '../styles/RemindersList.css';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const RemindersList = () => {
  // State
  const [showMore_pendingReminders, setShowMore_pendingReminders] = useState(12);
  const [reminders, setReminders] = useState([]);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Personal');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDueTime, setNewDueTime] = useState('09:00');
  const [newDescription, setNewDescription] = useState('');
  const [newRecurring, setNewRecurring] = useState('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Voice states
  const [voiceCreating, setVoiceCreating] = useState(false);
  const [pendingReminders, setPendingReminders] = useState([]);
  const voiceRecognitionRef = React.useRef(null);

  // API
  const API_URL = import.meta.env.VITE_API_URL || API + '';
  const PASSWORD = AMI_PASSWORD;

  // Detect mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load reminders
  const loadReminders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reminders/upcoming`, {
        headers: { 'X-Ami-Password': PASSWORD }
      });
      const data = await res.json();
      setReminders(data.reminders || []);
      setLoading(false);
    } catch (e) {
      console.error('Error loading reminders:', e);
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval = null;

    const start = () => {
      if (interval) return;
      interval = setInterval(loadReminders, 120000);
    };
    const stop = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadReminders();
        start();
      } else {
        stop();
      }
    };

    loadReminders();
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Add reminder from form
  const addReminder = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) return;

    try {
      const res = await fetch(`${API_URL}/api/reminders/create`, {
        method: 'POST',
        headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          type: newType,
          priority: newPriority,
          due_date: newDueDate,
          due_time: newDueTime,
          recurring: newRecurring
        })
      });

      if (res.ok) {
        loadReminders();
        setNewTitle('');
        setNewDescription('');
        setNewType('Personal');
        setNewPriority('medium');
        setNewDueDate(new Date().toISOString().split('T')[0]);
        setNewDueTime('09:00');
        setNewRecurring('none');
      }
    } catch (e) {
      console.error('Error adding reminder:', e);
    }
  };

  // Voice input handler
  const handleCreateVoiceReminder = () => {
    setVoiceCreating(true);
    const rec = startVoiceInput(
      (transcript) => {
        console.log('🎤 Voice reminders:', transcript);
        const reminders = parseVoiceInput(transcript);
        setPendingReminders(reminders);
        setVoiceCreating(false);
      },
      (error) => {
        setVoiceCreating(false);
        console.error('Voice error:', error);
        alert(`❌ Voice Error: ${error}`);
      },
      () => {}
    );
    voiceRecognitionRef.current = rec;
  };

  const handleStopVoice = () => {
    if (voiceRecognitionRef.current) {
      voiceRecognitionRef.current.stop();
      setVoiceCreating(false);
    }
  };

  // Confirm and create reminders
  const handleConfirmReminders = async () => {
    for (const reminder of pendingReminders) {
      try {
        const resp = await fetch(`${API_URL}/api/reminders/create`, {
          method: 'POST',
          headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
          body: JSON.stringify(reminder)
        });
        if (resp.ok) {
          speakReminder(reminder);
        }
      } catch (e) {
        console.error('Error creating reminder:', e);
      }
    }
    loadReminders();
    setPendingReminders([]);
  };

  const handleCancelReminders = () => {
    setPendingReminders([]);
  };

  // Complete reminder
  const completeReminder = async (id) => {
    try {
      await fetch(`${API_URL}/api/reminders/${id}/complete`, {
        method: 'POST',
        headers: { 'X-Ami-Password': PASSWORD }
      });
      loadReminders();
    } catch (e) {
      console.error('Error completing reminder:', e);
    }
  };

  // Delete reminder
  const deleteReminder = async (id) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await fetch(`${API_URL}/api/reminders/${id}`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': PASSWORD }
      });
      loadReminders();
    } catch (e) {
      console.error('Error deleting reminder:', e);
    }
  };

  // Snooze reminder
  const [snoozeOpen, setSnoozeOpen] = useState(null);

  const snoozeReminder = async (id, minutes) => {
    try {
      await fetch(`${API_URL}/api/reminders/${id}/snooze`, {
        method: 'POST',
        headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes })
      });
      setSnoozeOpen(null);
      loadReminders();
    } catch (e) {
      console.error('Error snoozing reminder:', e);
    }
  };

  // Filter reminders
  const filteredReminders = reminders.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  // Categorize reminders
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const todayReminders = filteredReminders.filter(r => r.due_date === today && r.status === 'pending');
  const next7Reminders = filteredReminders.filter(r => r.due_date > today && r.due_date <= tomorrow && r.status === 'pending');
  const next30Reminders = filteredReminders.filter(r => r.due_date > tomorrow && r.due_date <= next30 && r.status === 'pending');

  // Mobile-first styles
  const containerStyle = { padding: isMobile ? '12px' : '20px', maxWidth: '100%' };
  const sectionStyle = { marginBottom: '20px', padding: isMobile ? '16px' : '20px', borderRadius: '12px', border: '2px solid' };
  const formInputStyle = { width: '100%', padding: isMobile ? '14px' : '12px', marginBottom: '12px', borderRadius: '8px', border: '2px solid #444', background: '#1a1a1a', color: '#fff', fontSize: isMobile ? '16px' : '14px', boxSizing: 'border-box' };
  const gridStyle = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' };
  const buttonStyle = { width: '100%', padding: isMobile ? '14px' : '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '15px' : '14px', transition: 'all 0.2s' };
  const reminderCardStyle = { background: '#2a2a2a', padding: isMobile ? '14px' : '12px', marginBottom: '10px', borderRadius: '8px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '8px', border: '1px solid' };
  const buttonGroupStyle = { display: 'flex', gap: isMobile ? '10px' : '8px', flexWrap: 'wrap', justifyContent: isMobile ? 'stretch' : 'flex-end' };
  const smallButtonStyle = { flex: isMobile ? '1 1 calc(50% - 5px)' : 'auto', padding: isMobile ? '10px' : '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: isMobile ? '13px' : '12px', fontWeight: 'bold', minWidth: isMobile ? 'auto' : '80px' };

  return (
    <div style={containerStyle}>
      {/* CONFIRMATION MODAL */}
      {pendingReminders.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'flex-end' : 'center', zIndex: 9999, padding: isMobile ? '0' : '20px' }}>
          <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: isMobile ? '16px 16px 0 0' : '12px', border: '2px solid #667eea', maxWidth: isMobile ? '100%' : '500px', width: isMobile ? '100%' : 'auto', maxHeight: isMobile ? '80vh' : '80vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#667eea', marginTop: 0, marginBottom: '16px', fontSize: isMobile ? '18px' : '16px' }}>✅ {pendingReminders.length} Reminder{pendingReminders.length > 1 ? 's' : ''} Ready</h2>
            {pendingReminders.slice(0, showMore_pendingReminders).map((r, i) => (
              <div key={i} style={{ background: '#1a1a1a', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #444' }}>
                <div style={{ fontSize: isMobile ? '15px' : '14px', color: '#fff', fontWeight: 'bold' }}>📌 {r.title}</div>
                <div style={{ fontSize: isMobile ? '13px' : '12px', color: '#aaa', marginTop: '4px' }}>📅 {r.due_date} at {r.due_time}</div>
                {r.recurring !== 'none' && <div style={{ fontSize: isMobile ? '13px' : '12px', color: '#10b981', marginTop: '4px' }}>🔄 {r.recurring}</div>}
              </div>
            ))}
          {pendingReminders.length > showMore_pendingReminders && (
            <button onClick={() => setShowMore_pendingReminders(showMore_pendingReminders + 12)}
                    style={{ width: '100%', padding: '12px', minHeight: '44px', marginTop: '8px',
                             background: '#2a2a2a', color: '#aaa', border: 'none',
                             borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
              Show more ({pendingReminders.length - showMore_pendingReminders} more)
            </button>
          )}
          {showMore_pendingReminders > 12 && (
            <button onClick={() => setShowMore_pendingReminders(12)}
                    style={{ width: '100%', padding: '9px', marginTop: '6px',
                             background: 'transparent', color: '#6b6b7c',
                             border: '1px solid #2c2c3a', borderRadius: '8px',
                             fontSize: '12px', cursor: 'pointer' }}>
              Show less
            </button>
          )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
              <button onClick={handleConfirmReminders} style={{ ...buttonStyle, background: '#10b981', color: '#fff', flex: 1 }}>✅ Confirm</button>
              <button onClick={handleCancelReminders} style={{ ...buttonStyle, background: '#ef4444', color: '#fff', flex: 1 }}>❌ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* VOICE CREATE SECTION */}
      <div style={{ ...sectionStyle, background: '#1a2a1a', borderColor: '#10b981' }}>
        <h3 style={{ color: '#10b981', margin: '0 0 8px 0', fontSize: isMobile ? '15px' : '14px', fontWeight: 'bold' }}>🎤 CREATE WITH VOICE</h3>
        <p style={{ color: '#aaa', margin: '0 0 12px 0', fontSize: isMobile ? '13px' : '12px' }}>Say: "Call Jackson tomorrow" or "Text mama in 2 hours"</p>
        <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
          <button type="button" onClick={handleCreateVoiceReminder} disabled={voiceCreating} style={{ ...buttonStyle, background: voiceCreating ? '#ef4444' : '#10b981', color: '#fff', flex: isMobile ? 'auto' : 1 }}>
            {voiceCreating ? '🎤 Listening...' : '🎤 Start Listening'}
          </button>
          {voiceCreating && (
            <button type="button" onClick={handleStopVoice} style={{ ...buttonStyle, background: '#ef4444', color: '#fff', flex: isMobile ? 'auto' : 1 }}>
              ⏹️ Stop
            </button>
          )}
        </div>
      </div>

      {/* TEXT CREATE SECTION */}
      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #444' }}>
        <h3 style={{ color: '#667eea', margin: '0', fontSize: isMobile ? '15px' : '14px', fontWeight: 'bold' }}>📝 OR CREATE WITH TEXT</h3>
      </div>

      <form onSubmit={addReminder} style={{ ...sectionStyle, background: '#2a2a2a', borderColor: '#444' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="What do you want to be reminded about?"
          style={formInputStyle}
        />

        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Add details (optional)"
          style={{ ...formInputStyle, minHeight: isMobile ? '80px' : '50px' }}
        />

        <div style={gridStyle}>
          <select value={newType} onChange={(e) => setNewType(e.target.value)} style={{ ...formInputStyle, marginBottom: 0 }}>
            <option value="Personal">👤 Personal</option>
            <option value="Work">💼 Work</option>
            <option value="Health">🏥 Health</option>
            <option value="Finance">💰 Finance</option>
          </select>

          <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={{ ...formInputStyle, marginBottom: 0 }}>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          <select value={newRecurring} onChange={(e) => setNewRecurring(e.target.value)} style={{ ...formInputStyle, marginBottom: 0 }}>
            <option value="none">One-time</option>
            <option value="daily">📅 Daily</option>
            <option value="weekly">📅 Weekly</option>
            <option value="monthly">📅 Monthly</option>
            <option value="yearly">📅 Yearly</option>
            <option value="every_2_days">📅 Every other day</option>
            <option value="twice_weekly">📅 Twice a week</option>
            <option value="every_10_days">📅 Every 10 days</option>
            <option value="every_14_days">📅 Every 2 weeks</option>
          </select>

          <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} style={{ ...formInputStyle, marginBottom: 0 }} />
        </div>

        <input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} style={formInputStyle} />

        <button type="submit" style={{ ...buttonStyle, background: '#667eea', color: '#fff' }}>+ Add Reminder</button>
      </form>

      {/* FILTERS */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...formInputStyle, flex: isMobile ? 'auto' : 1, minWidth: isMobile ? 'auto' : '200px', marginBottom: 0 }}
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...formInputStyle, flex: isMobile ? 'auto' : 'auto', marginBottom: 0 }}>
          <option value="all">All Types</option>
          <option value="Personal">Personal</option>
          <option value="Work">Work</option>
          <option value="Health">Health</option>
          <option value="Finance">Finance</option>
        </select>
      </div>

      {/* TODAY REMINDERS */}
      {todayReminders.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#ef4444', fontSize: isMobile ? '15px' : '14px', fontWeight: 'bold', margin: '0 0 12px 0' }}>🔴 TODAY ({todayReminders.length})</h3>
          {todayReminders.map(r => (
            <div key={r.id} style={{ ...reminderCardStyle, borderColor: '#ef4444' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isMobile ? '15px' : '14px', color: '#fff', fontWeight: 'bold' }}>{r.title}</div>
                <div style={{ fontSize: isMobile ? '13px' : '12px', color: '#aaa' }}>🕐 {r.due_time}</div>
                {r.source && r.source !== 'manual' && <span style={{ fontSize: '11px', background: r.source === 'from_ami' ? '#667eea20' : r.source === 'from_notes' ? '#10b98120' : '#f59e0b20', color: r.source === 'from_ami' ? '#667eea' : r.source === 'from_notes' ? '#10b981' : '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', marginTop: '4px', display: 'inline-block' }}>📌 {r.source.replace('from_', '')}</span>}
              </div>
              <div style={buttonGroupStyle}>
                <button onClick={() => setSnoozeOpen(snoozeOpen === r.id ? null : r.id)} style={{ ...smallButtonStyle, background: '#667eea', color: '#fff' }}>⏰ Snooze</button>
                <button onClick={() => completeReminder(r.id)} style={{ ...smallButtonStyle, background: '#10b981', color: '#fff' }}>✓</button>
                <button onClick={() => deleteReminder(r.id)} style={{ ...smallButtonStyle, background: '#ef4444', color: '#fff' }}>🗑️</button>
              </div>
              {snoozeOpen === r.id && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px',
                              flexWrap: 'wrap' }}>
                  {[['5m', 5], ['15m', 15], ['1h', 60], ['3h', 180],
                    ['Tomorrow', 60 * 24]].map(([label, mins]) => (
                    <button key={label} onClick={() => snoozeReminder(r.id, mins)}
                            style={{ padding: '7px 12px', fontSize: '12px',
                                     background: '#2a2a35', color: '#ddd', border: 'none',
                                     borderRadius: '14px', cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* NEXT 7 DAYS */}
      {next7Reminders.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f59e0b', fontSize: isMobile ? '15px' : '14px', fontWeight: 'bold', margin: '0 0 12px 0' }}>🟡 NEXT 7 DAYS ({next7Reminders.length})</h3>
          {next7Reminders.map(r => (
            <div key={r.id} style={{ ...reminderCardStyle, borderColor: '#f59e0b' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isMobile ? '15px' : '14px', color: '#fff', fontWeight: 'bold' }}>{r.title}</div>
                <div style={{ fontSize: isMobile ? '13px' : '12px', color: '#aaa' }}>📅 {r.due_date} at {r.due_time}</div>
                {r.source && r.source !== 'manual' && <span style={{ fontSize: '11px', background: r.source === 'from_ami' ? '#667eea20' : r.source === 'from_notes' ? '#10b98120' : '#f59e0b20', color: r.source === 'from_ami' ? '#667eea' : r.source === 'from_notes' ? '#10b981' : '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', marginTop: '4px', display: 'inline-block' }}>📌 {r.source.replace('from_', '')}</span>}
              </div>
              <div style={buttonGroupStyle}>
                <button onClick={() => completeReminder(r.id)} style={{ ...smallButtonStyle, background: '#10b981', color: '#fff' }}>✓</button>
                <button onClick={() => deleteReminder(r.id)} style={{ ...smallButtonStyle, background: '#ef4444', color: '#fff' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEXT 30 DAYS */}
      {next30Reminders.length > 0 && (
        <div>
          <h3 style={{ color: '#3b82f6', fontSize: isMobile ? '15px' : '14px', fontWeight: 'bold', margin: '0 0 12px 0' }}>🔵 NEXT 30 DAYS ({next30Reminders.length})</h3>
          {next30Reminders.map(r => (
            <div key={r.id} style={{ ...reminderCardStyle, borderColor: '#3b82f6' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: isMobile ? '15px' : '14px', color: '#fff', fontWeight: 'bold' }}>{r.title}</div>
                <div style={{ fontSize: isMobile ? '13px' : '12px', color: '#aaa' }}>📅 {r.due_date} at {r.due_time}</div>
                {r.source && r.source !== 'manual' && <span style={{ fontSize: '11px', background: r.source === 'from_ami' ? '#667eea20' : r.source === 'from_notes' ? '#10b98120' : '#f59e0b20', color: r.source === 'from_ami' ? '#667eea' : r.source === 'from_notes' ? '#10b981' : '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', marginTop: '4px', display: 'inline-block' }}>📌 {r.source.replace('from_', '')}</span>}
              </div>
              <div style={buttonGroupStyle}>
                <button onClick={() => completeReminder(r.id)} style={{ ...smallButtonStyle, background: '#10b981', color: '#fff' }}>✓</button>
                <button onClick={() => deleteReminder(r.id)} style={{ ...smallButtonStyle, background: '#ef4444', color: '#fff' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <div style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>Loading reminders...</div>}
      {!loading && filteredReminders.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No reminders yet! 🎉</div>}
    
      {/* REMINDER DETAIL MODAL */}
      {selectedReminder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'flex-end' : 'center', zIndex: 9998, padding: isMobile ? '0' : '20px' }}>
          <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: isMobile ? '16px 16px 0 0' : '12px', border: '2px solid #667eea', maxWidth: isMobile ? '100%' : '500px', width: isMobile ? '100%' : 'auto', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: '#667eea', margin: 0, fontSize: isMobile ? '18px' : '16px' }}>📌 {selectedReminder.title}</h2>
              <button onClick={() => setSelectedReminder(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* DETAILS */}
            <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>📅 Due Date</div>
              <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>{selectedReminder.due_date}</div>
            </div>

            <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>🕐 Time</div>
              <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>{selectedReminder.due_time}</div>
            </div>

            <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>🏷️ Type</div>
              <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>{selectedReminder.type}</div>
            </div>

            <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>⭐ Priority</div>
              <div style={{ fontSize: '14px', color: selectedReminder.priority === 'high' ? '#ef4444' : selectedReminder.priority === 'medium' ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>
                {selectedReminder.priority === 'high' ? '🔴 High' : selectedReminder.priority === 'medium' ? '🟡 Medium' : '🟢 Low'}
              </div>
            </div>

            {selectedReminder.description && (
              <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>📝 Description</div>
                <div style={{ fontSize: '14px', color: '#fff', wordBreak: 'break-word' }}>{selectedReminder.description}</div>
              </div>
            )}

            {selectedReminder.recurring !== 'none' && (
              <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>🔄 Recurring</div>
                <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold' }}>{selectedReminder.recurring}</div>
              </div>
            )}

            {/* ACTIONS */}
            <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row', marginTop: '16px' }}>
              <button onClick={() => snoozeReminder(selectedReminder.id, 5)} style={{ flex: 1, padding: isMobile ? '12px' : '10px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '14px' : '13px' }}>+5 min</button>
              <button onClick={() => { completeReminder(selectedReminder.id); setSelectedReminder(null); }} style={{ flex: 1, padding: isMobile ? '12px' : '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '14px' : '13px' }}>✓ Complete</button>
              <button onClick={() => { deleteReminder(selectedReminder.id); setSelectedReminder(null); }} style={{ flex: 1, padding: isMobile ? '12px' : '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? '14px' : '13px' }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RemindersList;
